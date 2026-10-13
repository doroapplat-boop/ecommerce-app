import { clerkClient } from "@clerk/express";
import User from "../models/User.js";
import { Request, Response, NextFunction } from "express";

const isStaff = (role?: string) => role === "admin" || role === "super_admin";

function ownerEmailFromEnv() {
    return String(process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "")
        .replace(/["']/g, "")
        .trim()
        .toLowerCase();
}

function resolveClerkEmail(
    clerkUser: Awaited<ReturnType<typeof clerkClient.users.getUser>>,
    ownerEmail: string
) {
    const addresses = (clerkUser.emailAddresses || []).map((e) =>
        String(e.emailAddress || "")
            .trim()
            .toLowerCase()
    );

    // Prefer configured owner email if this Clerk user has it
    if (ownerEmail && addresses.includes(ownerEmail)) {
        return ownerEmail;
    }

    const primary = clerkUser.emailAddresses?.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress;

    return String(primary || addresses[0] || "")
        .trim()
        .toLowerCase();
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = await req.auth();

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Not authorized",
            });
        }

        const ownerEmail = ownerEmailFromEnv();
        let user = await User.findOne({ clerkId: userId });
        const clerkUser = await clerkClient.users.getUser(userId);
        const email = resolveClerkEmail(clerkUser, ownerEmail);
        const phone = clerkUser.phoneNumbers?.[0]?.phoneNumber;
        const metaRole = String(clerkUser.publicMetadata?.role || "user");
        let role: "user" | "admin" | "super_admin" =
            metaRole === "super_admin" || metaRole === "admin" ? (metaRole as any) : "user";

        if (ownerEmail && email === ownerEmail) {
            role = "super_admin";
        }

        if (!user) {
            // Same person, new Clerk Production user id — link existing Mongo row
            if (email) {
                user = await User.findOne({
                    email: {
                        $regex: new RegExp(
                            `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                            "i"
                        ),
                    },
                });
            }
            if (!user && phone) {
                user = await User.findOne({ phone });
            }

            if (user) {
                user.clerkId = userId;
                if (clerkUser.imageUrl) user.image = clerkUser.imageUrl;
                const name =
                    `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();
                if (name) user.name = name;
                if (role === "super_admin" || (role === "admin" && user.role === "user")) {
                    user.role = role;
                }
                await user.save();
            }
        }

        if (!user) {
            if (!email && !phone) {
                return res.status(401).json({
                    success: false,
                    message: "Phone or email not found",
                });
            }

            try {
                user = await User.create({
                    name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
                    email: email || undefined,
                    phone,
                    clerkId: userId,
                    image: clerkUser.imageUrl,
                    role,
                });
            } catch (createErr: any) {
                if (createErr?.code === 11000) {
                    user =
                        (email ? await User.findOne({ email }) : null) ||
                        (phone ? await User.findOne({ phone }) : null) ||
                        (await User.findOne({ clerkId: userId }));
                    if (user) {
                        user.clerkId = userId;
                        await user.save();
                    }
                }
                if (!user) throw createErr;
            }
        } else if (user.clerkId !== userId) {
            user.clerkId = userId;
            await user.save();
        }

        if (user) {
            let dirty = false;
            if (email && user.email !== email) {
                user.email = email;
                dirty = true;
            }
            if (user.role !== role && (role === "super_admin" || role === "admin")) {
                // Never downgrade via this sync; only upgrade / set owner
                if (role === "super_admin" || user.role === "user") {
                    user.role = role;
                    dirty = true;
                }
            }
            if (role === "super_admin" && user.role !== "super_admin") {
                user.role = "super_admin";
                dirty = true;
            }
            if (dirty) await user.save();

            if (role === "super_admin" && metaRole !== "super_admin") {
                try {
                    await clerkClient.users.updateUserMetadata(userId, {
                        publicMetadata: {
                            ...(clerkUser.publicMetadata || {}),
                            role: "super_admin",
                        },
                    });
                } catch (metaErr) {
                    console.error("Clerk metadata sync:", metaErr);
                }
            }
        }

        req.user = user;
        next();
    } catch (err: any) {
        console.error("Auth error:", err);
        const clerkMsg = err?.errors?.[0]?.message || err?.message || "";
        const status =
            clerkMsg.includes("Unauthorized") ||
            clerkMsg.includes("invalid") ||
            clerkMsg.includes("expired")
                ? 401
                : 500;
        res.status(status).json({
            success: false,
            message:
                status === 401
                    ? "Session expired. Sign out and sign in again."
                    : "Authentication failed",
        });
    }
};

export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userRole = String(req.user?.role || "");
        const email = String(req.user?.email || "")
            .trim()
            .toLowerCase();
        const ownerEmail = ownerEmailFromEnv();

        // Owner email always allowed on staff routes
        const isOwner = !!ownerEmail && email === ownerEmail;
        const allowed =
            isOwner ||
            roles.includes(userRole) ||
            userRole === "super_admin" ||
            (userRole === "admin" && roles.includes("admin"));

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: "User role is not authorized to access this route",
            });
        }
        next();
    };
};

/** Only the owner (super_admin) can manage admins / payment methods */
export const authorizeSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role as string;
    const email = String(req.user?.email || "").toLowerCase();
    const ownerEmail = ownerEmailFromEnv();

    if (userRole === "super_admin" || (ownerEmail && email === ownerEmail)) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: "Only the owner can manage admins, users, and payment methods",
    });
};

export { isStaff };

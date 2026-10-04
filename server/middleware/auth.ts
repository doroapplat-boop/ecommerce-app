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
            if (!email && !phone) {
                return res.status(401).json({
                    success: false,
                    message: "Phone or email not found",
                });
            }

            user = await User.create({
                name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
                email: email || undefined,
                phone,
                clerkId: userId,
                image: clerkUser.imageUrl,
                role,
            });
        } else {
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
                await clerkClient.users.updateUserMetadata(userId, {
                    publicMetadata: {
                        ...(clerkUser.publicMetadata || {}),
                        role: "super_admin",
                    },
                });
            }
        }

        req.user = user;
        next();
    } catch (err) {
        console.error("Auth error:", err);
        res.status(500).json({
            success: false,
            message: "Authentication failed",
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
        message: "Only the owner can manage admins and payment methods",
    });
};

export { isStaff };

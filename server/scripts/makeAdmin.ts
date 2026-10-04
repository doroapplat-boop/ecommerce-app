import User from "../models/User.js";
import { clerkClient } from "@clerk/express";

function ownerEmailFromEnv() {
    return String(process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "")
        .replace(/["']/g, "")
        .trim()
        .toLowerCase();
}

async function setClerkRole(clerkId: string, role: "user" | "admin" | "super_admin") {
    const clerkUser = await clerkClient.users.getUser(clerkId);
    await clerkClient.users.updateUserMetadata(clerkId, {
        publicMetadata: {
            ...(clerkUser.publicMetadata || {}),
            role,
        },
    });
}

/**
 * 1) Promote ADMIN_EMAIL / SUPER_ADMIN_EMAIL to the only owner (super_admin)
 * 2) Demote any other super_admin → admin
 */
const makeAdmin = async () => {
    try {
        const phone = String(process.env.ADMIN_PHONE || "")
            .replace(/["']/g, "")
            .trim();
        const email = ownerEmailFromEnv();

        if (!phone && !email) {
            console.log("makeAdmin: no ADMIN_EMAIL / SUPER_ADMIN_EMAIL set — skipped");
            return;
        }

        let owner = phone
            ? await User.findOne({ phone })
            : await User.findOne({
                  email: {
                      $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
                  },
              });

        // Resolve owner from Clerk (handles same account with old email in Mongo)
        let clerkUser: Awaited<ReturnType<typeof clerkClient.users.getUser>> | null = null;
        if (email) {
            const list = await clerkClient.users.getUserList({
                emailAddress: [email],
                limit: 1,
            });
            clerkUser = list.data?.[0] || null;
        }

        if (!owner && clerkUser) {
            owner = await User.findOne({ clerkId: clerkUser.id });
        }

        if (!owner && clerkUser) {
            const name =
                `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
                email.split("@")[0];
            owner = await User.create({
                clerkId: clerkUser.id,
                email,
                name,
                image: clerkUser.imageUrl,
                role: "super_admin",
            });
        }

        if (!owner) {
            console.log(
                "makeAdmin: owner account not found yet. Sign up once with",
                email || phone,
                "then run: npm run set-owner"
            );
            return;
        }

        // Fix stale email on the Mongo row (e.g. still showing doroapplat@...)
        if (email) owner.email = email;
        if (clerkUser) {
            owner.clerkId = clerkUser.id;
            owner.name =
                `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || owner.name;
            if (clerkUser.imageUrl) owner.image = clerkUser.imageUrl;
        }
        owner.role = "super_admin";
        await owner.save();

        if (owner.clerkId) {
            await setClerkRole(owner.clerkId as string, "super_admin");
        }
        console.log("Owner set to super_admin:", owner.email || owner.phone);

        // Anyone else who was super_admin → normal admin
        const others = await User.find({
            role: "super_admin",
            _id: { $ne: owner._id },
        });

        for (const u of others) {
            u.role = "admin";
            await u.save();
            if (u.clerkId) {
                await setClerkRole(u.clerkId as string, "admin");
            }
            console.log("Demoted previous owner to admin:", u.email || u.phone);
        }
    } catch (err: any) {
        console.error("Admin promotion failed:", err.message);
    }
};

export default makeAdmin;

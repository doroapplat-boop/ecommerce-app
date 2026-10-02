import User from "../models/User.js";
import { clerkClient } from "@clerk/express";

const makeAdmin = async () => {
    try {
        const phone = process.env.ADMIN_PHONE;
        const email = process.env.ADMIN_EMAIL;

        const query = phone ? { phone } : email ? { email } : null;
        if (!query) return;

        const user = await User.findOneAndUpdate(query, { role: "admin" });
        if (user) {
            await clerkClient.users.updateUserMetadata(user.clerkId as string, {
                publicMetadata: {
                    role: "admin",
                },
            });
        }
    } catch (err: any) {
        console.error("Admin promotion failed:", err.message);
    }
};

export default makeAdmin;

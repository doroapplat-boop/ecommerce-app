import { Request, Response } from "express";
import User from "../models/User.js";
import Cart from "../models/Cart.js";
import Wishlist from "../models/Wishlist.js";
import Address from "../models/Address.js";

/** DELETE /api/users/me — remove personal app data for the signed-in user */
export const deleteMyAccountData = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        const clerkId = req.user?.clerkId;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Not authorized" });
        }

        await Promise.all([
            Cart.deleteMany({ user: userId }),
            Wishlist.deleteMany({ user: userId }),
            Address.deleteMany({ user: userId }),
        ]);

        // Soft-remove user profile row (orders may remain for records)
        if (clerkId) {
            await User.deleteOne({ _id: userId });
        }

        res.json({
            success: true,
            message: "Account data deleted. Complete Clerk account deletion in the app if needed.",
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

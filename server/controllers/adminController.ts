import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { Request, Response } from "express";
import { clerkClient } from "@clerk/express";

// GET /api/admin/stats
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();

        const validOrders = await Order.find({ orderStatus: { $ne: "cancelled" } });
        const totalRevenue = validOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        const recentOrders = await Order.find().sort("-createdAt").limit(5).populate("user", "name email");

        res.json({
            success: true,
            data: {
                totalUsers,
                totalProducts,
                totalOrders,
                totalRevenue,
                recentOrders,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/admins
export const getAdmins = async (req: Request, res: Response) => {
    try {
        const admins = await User.find({ role: { $in: ["admin", "super_admin"] } })
            .select("name email phone role image createdAt clerkId")
            .sort("-createdAt");

        res.json({ success: true, data: admins });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/admin/admins
// Promote an existing account to admin by email only
export const addAdmin = async (req: Request, res: Response) => {
    try {
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const existingList = await clerkClient.users.getUserList({
            emailAddress: [email],
            limit: 1,
        });
        const clerkUser = existingList.data?.[0];

        if (!clerkUser) {
            return res.status(404).json({
                success: false,
                message: "No account found with this email. They must sign up first.",
            });
        }

        await clerkClient.users.updateUserMetadata(clerkUser.id, {
            publicMetadata: {
                ...(clerkUser.publicMetadata || {}),
                role: "admin",
            },
        });

        const name =
            `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
            email.split("@")[0];

        let user = await User.findOne({ $or: [{ clerkId: clerkUser.id }, { email }] });

        if (user) {
            user.role = "admin";
            user.clerkId = clerkUser.id;
            user.email = email;
            user.name = name;
            if (clerkUser.imageUrl) user.image = clerkUser.imageUrl;
            await user.save();
        } else {
            user = await User.create({
                clerkId: clerkUser.id,
                email,
                name,
                image: clerkUser.imageUrl,
                role: "admin",
            });
        }

        res.status(201).json({
            success: true,
            message: "Admin added successfully",
            data: user,
        });
    } catch (error: any) {
        const clerkMessage =
            error?.errors?.[0]?.longMessage ||
            error?.errors?.[0]?.message ||
            error?.message ||
            "Failed to add admin";
        res.status(400).json({ success: false, message: clerkMessage });
    }
};

// DELETE /api/admin/admins/:id
export const removeAdmin = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const ownerEmail = String(process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "")
            .replace(/["']/g, "")
            .trim()
            .toLowerCase();
        const actorEmail = String(req.user?.email || "")
            .trim()
            .toLowerCase();

        if (req.user._id.toString() === id) {
            return res.status(400).json({
                success: false,
                message: "You cannot remove your own admin access. Sign in as the owner email first.",
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (user.role !== "admin" && user.role !== "super_admin") {
            return res.status(400).json({ success: false, message: "User is not an admin" });
        }

        const targetEmail = String(user.email || "")
            .trim()
            .toLowerCase();

        // Only the env owner account is protected — other super_admins can be demoted by owner
        if (ownerEmail && targetEmail === ownerEmail) {
            return res.status(400).json({
                success: false,
                message: "Cannot remove the owner account",
            });
        }

        if (user.role === "super_admin" && actorEmail !== ownerEmail) {
            return res.status(400).json({
                success: false,
                message: "Only the owner can remove another super admin",
            });
        }

        if (user.clerkId) {
            const clerkUser = await clerkClient.users.getUser(user.clerkId);
            await clerkClient.users.updateUserMetadata(user.clerkId, {
                publicMetadata: {
                    ...(clerkUser.publicMetadata || {}),
                    role: "user",
                },
            });
        }

        user.role = "user";
        await user.save();

        res.json({ success: true, message: "Admin access removed", data: user });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

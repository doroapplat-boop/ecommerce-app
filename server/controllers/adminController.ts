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
        const admins = await User.find({ role: "admin" })
            .select("name email phone role image createdAt clerkId")
            .sort("-createdAt");

        res.json({ success: true, data: admins });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/admin/admins
// Promote existing user by email, or create a new Clerk admin account
export const addAdmin = async (req: Request, res: Response) => {
    try {
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();
        const password = String(req.body.password || "").trim();
        const firstName = String(req.body.firstName || "").trim();
        const lastName = String(req.body.lastName || "").trim();

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const existingList = await clerkClient.users.getUserList({
            emailAddress: [email],
            limit: 1,
        });
        let clerkUser = existingList.data?.[0];

        if (!clerkUser) {
            if (!password) {
                return res.status(404).json({
                    success: false,
                    message: "No account found with this email. Enter a password to create a new admin.",
                });
            }
            if (password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be at least 8 characters",
                });
            }

            clerkUser = await clerkClient.users.createUser({
                emailAddress: [email],
                password,
                firstName: firstName || undefined,
                lastName: lastName || undefined,
                publicMetadata: { role: "admin" },
            });
        } else {
            await clerkClient.users.updateUserMetadata(clerkUser.id, {
                publicMetadata: {
                    ...(clerkUser.publicMetadata || {}),
                    role: "admin",
                },
            });
        }

        const name =
            `${clerkUser.firstName || firstName || ""} ${clerkUser.lastName || lastName || ""}`.trim() ||
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

        if (req.user._id.toString() === id) {
            return res.status(400).json({
                success: false,
                message: "You cannot remove your own admin access",
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (user.role !== "admin") {
            return res.status(400).json({ success: false, message: "User is not an admin" });
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

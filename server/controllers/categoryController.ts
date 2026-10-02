import Category from "../models/Category.js";
import cloudinary from "../config/cloudinary.js";
import { Request, Response } from "express";

// GET /api/categories
export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
        res.json({ success: true, data: categories });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/categories/all (admin)
export const getAllCategories = async (req: Request, res: Response) => {
    try {
        const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
        res.json({ success: true, data: categories });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/categories
export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, icon, sortOrder, isActive } = req.body;

        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, message: "Category name is required" });
        }

        let image = typeof req.body.image === "string" ? req.body.image : undefined;

        if (req.file) {
            try {
                image = await new Promise<string>((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: "ecommerce-app/categories" },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result!.secure_url);
                        }
                    );
                    uploadStream.end(req.file!.buffer);
                });
            } catch (uploadErr: any) {
                console.error("Category image upload failed:", uploadErr);
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload category image. Check Cloudinary settings.",
                });
            }
        }

        const category = await Category.create({
            name: String(name).trim(),
            icon: icon || "apps-outline",
            image,
            sortOrder: Number(sortOrder) || 0,
            isActive: isActive === undefined ? true : isActive === true || isActive === "true",
        });

        res.status(201).json({ success: true, data: category });
    } catch (error: any) {
        console.error("createCategory error:", error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Category name already exists" });
        }
        res.status(500).json({ success: false, message: error.message || "Failed to create category" });
    }
};

// PUT /api/categories/:id
export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { name, icon, sortOrder, isActive, image } = req.body;
        const updateData: any = {};

        if (name !== undefined) updateData.name = String(name).trim();
        if (icon !== undefined) updateData.icon = icon;
        if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder) || 0;
        if (isActive !== undefined) updateData.isActive = isActive === true || isActive === "true";

        if (req.file) {
            try {
                updateData.image = await new Promise<string>((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: "ecommerce-app/categories" },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result!.secure_url);
                        }
                    );
                    uploadStream.end(req.file!.buffer);
                });
            } catch (uploadErr: any) {
                console.error("Category image upload failed:", uploadErr);
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload category image. Check Cloudinary settings.",
                });
            }
        } else if (typeof image === "string") {
            updateData.image = image;
        }

        const category = await Category.findByIdAndUpdate(req.params.id, { $set: updateData }, {
            new: true,
            runValidators: true,
        });

        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        res.json({ success: true, data: category });
    } catch (error: any) {
        console.error("updateCategory error:", error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Category name already exists" });
        }
        res.status(500).json({ success: false, message: error.message || "Failed to update category" });
    }
};

// DELETE /api/categories/:id
export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        res.json({ success: true, message: "Category deleted" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

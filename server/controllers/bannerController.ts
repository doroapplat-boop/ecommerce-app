import Banner from "../models/Banner.js";
import cloudinary from "../config/cloudinary.js";
import { Request, Response } from "express";

export const getBanners = async (req: Request, res: Response) => {
    try {
        const banners = await Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
        res.json({ success: true, data: banners });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllBanners = async (req: Request, res: Response) => {
    try {
        const banners = await Banner.find().sort({ sortOrder: 1, createdAt: -1 });
        res.json({ success: true, data: banners });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createBanner = async (req: Request, res: Response) => {
    try {
        const { title, subtitle, buttonText, link, sortOrder, isActive } = req.body;

        if (!title?.trim()) {
            return res.status(400).json({ success: false, message: "Title is required" });
        }

        let image = req.body.image;
        if (req.file) {
            image = await new Promise<string>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: "ecommerce-app/banners" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result!.secure_url);
                    }
                );
                uploadStream.end(req.file!.buffer);
            });
        }

        if (!image) {
            return res.status(400).json({ success: false, message: "Banner image is required" });
        }

        const banner = await Banner.create({
            title: title.trim(),
            subtitle: subtitle || "",
            buttonText: buttonText || "Get Now",
            link: link || "/shop",
            image,
            sortOrder: Number(sortOrder) || 0,
            isActive: isActive === undefined ? true : isActive === true || isActive === "true",
        });

        res.status(201).json({ success: true, data: banner });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateBanner = async (req: Request, res: Response) => {
    try {
        const { title, subtitle, buttonText, link, sortOrder, isActive } = req.body;
        const updateData: any = {};

        if (title !== undefined) updateData.title = title.trim();
        if (subtitle !== undefined) updateData.subtitle = subtitle;
        if (buttonText !== undefined) updateData.buttonText = buttonText;
        if (link !== undefined) updateData.link = link;
        if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder) || 0;
        if (isActive !== undefined) updateData.isActive = isActive === true || isActive === "true";

        if (req.file) {
            updateData.image = await new Promise<string>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: "ecommerce-app/banners" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result!.secure_url);
                    }
                );
                uploadStream.end(req.file!.buffer);
            });
        }

        const banner = await Banner.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found" });
        }

        res.json({ success: true, data: banner });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteBanner = async (req: Request, res: Response) => {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id);
        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found" });
        }
        res.json({ success: true, message: "Banner deleted" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

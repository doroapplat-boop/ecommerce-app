import PaymentMethod from "../models/PaymentMethod.js";
import cloudinary from "../config/cloudinary.js";
import { Request, Response } from "express";

const uploadImage = (buffer: Buffer, folder: string) =>
    new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
            if (error) reject(error);
            else resolve(result!.secure_url);
        });
        uploadStream.end(buffer);
    });

export const getPaymentMethods = async (req: Request, res: Response) => {
    try {
        const methods = await PaymentMethod.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
        res.json({ success: true, data: methods });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllPaymentMethods = async (req: Request, res: Response) => {
    try {
        const methods = await PaymentMethod.find().sort({ sortOrder: 1, createdAt: -1 });
        res.json({ success: true, data: methods });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createPaymentMethod = async (req: Request, res: Response) => {
    try {
        const { name, accountName, accountNumber, sortOrder, isActive } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ success: false, message: "Name is required" });
        }
        if (!accountNumber?.trim()) {
            return res.status(400).json({ success: false, message: "Account number is required" });
        }

        let image = typeof req.body.image === "string" ? req.body.image : "";
        if (req.file) {
            try {
                image = await uploadImage(req.file.buffer, "ecommerce-app/payment-methods");
            } catch (uploadErr: any) {
                console.error("Payment logo upload failed:", uploadErr);
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload logo. Check Cloudinary settings.",
                });
            }
        }

        if (!image) {
            return res.status(400).json({ success: false, message: "Logo image is required" });
        }

        const method = await PaymentMethod.create({
            name: String(name).trim(),
            accountName: String(accountName || "").trim(),
            accountNumber: String(accountNumber).trim(),
            image,
            sortOrder: Number(sortOrder) || 0,
            isActive: isActive === undefined ? true : isActive === true || isActive === "true",
        });

        res.status(201).json({ success: true, data: method });
    } catch (error: any) {
        console.error("createPaymentMethod error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to create payment method" });
    }
};

export const updatePaymentMethod = async (req: Request, res: Response) => {
    try {
        const { name, accountName, accountNumber, sortOrder, isActive, image } = req.body;
        const updateData: any = {};

        if (name !== undefined) updateData.name = String(name).trim();
        // Always persist accountName when sent (including empty), so edits keep the holder name
        if (accountName !== undefined) updateData.accountName = String(accountName ?? "").trim();
        if (accountNumber !== undefined) updateData.accountNumber = String(accountNumber).trim();
        if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder) || 0;
        if (isActive !== undefined) updateData.isActive = isActive === true || isActive === "true";

        if (req.file) {
            try {
                updateData.image = await uploadImage(req.file.buffer, "ecommerce-app/payment-methods");
            } catch (uploadErr: any) {
                console.error("Payment logo upload failed:", uploadErr);
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload logo. Check Cloudinary settings.",
                });
            }
        } else if (typeof image === "string" && image.trim()) {
            updateData.image = image.trim();
        }

        const method = await PaymentMethod.findByIdAndUpdate(req.params.id, { $set: updateData }, {
            new: true,
            runValidators: true,
        });

        if (!method) {
            return res.status(404).json({ success: false, message: "Payment method not found" });
        }

        res.json({ success: true, data: method });
    } catch (error: any) {
        console.error("updatePaymentMethod error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to update payment method" });
    }
};

export const deletePaymentMethod = async (req: Request, res: Response) => {
    try {
        const method = await PaymentMethod.findByIdAndDelete(req.params.id);
        if (!method) {
            return res.status(404).json({ success: false, message: "Payment method not found" });
        }
        res.json({ success: true, message: "Payment method deleted" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

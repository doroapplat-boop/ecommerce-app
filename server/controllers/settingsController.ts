import Setting from "../models/Setting.js";
import { Request, Response } from "express";

const DEFAULT_FEE = 2;

export const getOrCreateSettings = async () => {
    let settings = await Setting.findOne({ key: "app" });
    if (!settings) {
        settings = await Setting.create({ key: "app", deliveryFee: DEFAULT_FEE });
    }
    return settings;
};

export const getDeliverySettings = async (_req: Request, res: Response) => {
    try {
        const settings = await getOrCreateSettings();
        res.json({
            success: true,
            data: {
                deliveryFee: Number(settings.deliveryFee) || 0,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateDeliverySettings = async (req: Request, res: Response) => {
    try {
        const fee = Number(req.body.deliveryFee);
        if (Number.isNaN(fee) || fee < 0) {
            return res.status(400).json({
                success: false,
                message: "Delivery fee must be a number 0 or greater",
            });
        }

        const settings = await Setting.findOneAndUpdate(
            { key: "app" },
            { $set: { deliveryFee: fee } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json({
            success: true,
            data: {
                deliveryFee: Number(settings?.deliveryFee) || 0,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

import mongoose from "mongoose";

export interface ISetting {
    key: string;
    deliveryFee: number;
    updatedAt: Date;
    createdAt: Date;
}

const settingSchema = new mongoose.Schema<ISetting>(
    {
        key: { type: String, required: true, unique: true, default: "app" },
        deliveryFee: { type: Number, required: true, default: 2, min: 0 },
    },
    { timestamps: true }
);

const Setting = mongoose.model<ISetting>("Setting", settingSchema);

export default Setting;

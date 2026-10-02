import mongoose from "mongoose";

export interface IBanner {
    title: string;
    subtitle: string;
    buttonText: string;
    image: string;
    link?: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const bannerSchema = new mongoose.Schema<IBanner>(
    {
        title: { type: String, required: true, trim: true },
        subtitle: { type: String, default: "", trim: true },
        buttonText: { type: String, default: "Get Now", trim: true },
        image: { type: String, required: true },
        link: { type: String, default: "/shop" },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const Banner = mongoose.model<IBanner>("Banner", bannerSchema);

export default Banner;

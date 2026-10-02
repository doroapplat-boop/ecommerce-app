import mongoose from "mongoose";

export interface ICategory {
    name: string;
    image?: string;
    icon?: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const categorySchema = new mongoose.Schema<ICategory>(
    {
        name: { type: String, required: true, unique: true, trim: true },
        image: { type: String },
        icon: { type: String, default: "apps-outline" },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const Category = mongoose.model<ICategory>("Category", categorySchema);

export default Category;

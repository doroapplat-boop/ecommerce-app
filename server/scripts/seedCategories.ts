import mongoose from "mongoose";
import Category from "../models/Category.js";

const DEFAULT_CATEGORIES = [
    { name: "Men", icon: "shirt-outline", sortOrder: 1 },
    { name: "Women", icon: "sparkles-outline", sortOrder: 2 },
    { name: "Kids", icon: "balloon-outline", sortOrder: 3 },
    { name: "Shoes", icon: "walk-outline", sortOrder: 4 },
    { name: "Bags", icon: "bag-handle-outline", sortOrder: 5 },
    { name: "Other", icon: "apps-outline", sortOrder: 6 },
];

export const seedCategories = async () => {
    try {
        const count = await Category.countDocuments();
        if (count > 0) return;

        await Category.insertMany(DEFAULT_CATEGORIES);
        console.log("Default categories seeded");
    } catch (error: any) {
        console.error("Category seed failed:", error.message);
    }
};

export default seedCategories;

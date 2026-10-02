import Product from "../models/Product.js";
import cloudinary from "../config/cloudinary.js";
import { Request, Response } from "express";

// Get all products
// GET /api/products
export const getProducts = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, category, search, sort = "-createdAt", minPrice, maxPrice } = req.query;

        const query: any = { isActive: true };

        if (category && category !== "All") {
            const categoryName = String(category).trim();
            query.category = { $regex: `^${categoryName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };
        }

        if (search) {
            query.$text = { $search: String(search) };
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        const total = await Product.countDocuments(query);
        const products = await Product.find(query)
            .sort(String(sort))
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({
            success: true,
            data: products,
            pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single product
// GET /api/products/:id
export const getProduct = async (req: Request, res: Response) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.json({ success: true, data: product });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create product
// POST /api/products
export const createProduct = async (req: Request, res: Response) => {
    try {
        let images = [];

        // Handle file uploads
        if (req.files && (req.files as any).length > 0) {
            try {
                const uploadPromises = (req.files as any).map((file: any) => {
                    return new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: "ecommerce-app/products" },
                            (error, result) => {
                                if (error) reject(error);
                                else resolve(result!.secure_url);
                            }
                        );
                        uploadStream.end(file.buffer);
                    });
                });

                images = await Promise.all(uploadPromises);
            } catch (uploadErr: any) {
                console.error("Product image upload failed:", uploadErr);
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload product images. Check Cloudinary settings.",
                });
            }
        } else if (req.body.images) {
            if (Array.isArray(req.body.images)) {
                images = req.body.images;
            } else {
                images = [req.body.images];
            }
        }

        const { sizes: _sizes, ...bodyWithoutSizes } = req.body;

        const productData: any = {
            ...bodyWithoutSizes,
            name: typeof bodyWithoutSizes.name === "string" ? bodyWithoutSizes.name.trim() : bodyWithoutSizes.name,
            description:
                typeof bodyWithoutSizes.description === "string" && bodyWithoutSizes.description.trim()
                    ? bodyWithoutSizes.description.trim()
                    : "No description",
            category: typeof bodyWithoutSizes.category === "string" ? bodyWithoutSizes.category.trim() : bodyWithoutSizes.category,
            price: Number(bodyWithoutSizes.price),
            stock: Number(bodyWithoutSizes.stock) || 0,
            isFeatured: bodyWithoutSizes.isFeatured === true || bodyWithoutSizes.isFeatured === "true",
            images: images,
        };

        if (bodyWithoutSizes.comparePrice === "" || bodyWithoutSizes.comparePrice === undefined || bodyWithoutSizes.comparePrice === null) {
            productData.comparePrice = undefined;
        } else {
            productData.comparePrice = Number(bodyWithoutSizes.comparePrice);
        }

        if (!productData.name) {
            return res.status(400).json({ success: false, message: "Product name is required" });
        }

        if (Number.isNaN(productData.price)) {
            return res.status(400).json({ success: false, message: "Valid price is required" });
        }

        if (images.length === 0) {
            return res.status(400).json({ success: false, message: "Please upload at least one image" });
        }

        const product = await Product.create(productData);
        res.status(201).json({ success: true, data: product });
    } catch (error: any) {
        console.error("createProduct error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to create product" });
    }
};

// Update product
// PUT /api/products/:id
export const updateProduct = async (req: Request, res: Response) => {
    try {
        let images: string[] = [];

        if (req.body.existingImages) {
            if (Array.isArray(req.body.existingImages)) {
                images = [...req.body.existingImages];
            } else {
                images = [req.body.existingImages];
            }
        }

        if (req.files && (req.files as any).length > 0) {
            const uploadPromises = (req.files as any).map((file: any) => {
                return new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream({ folder: "ecommerce-app/products" }, (error, result) => {
                        if (error) reject(error);
                        else resolve(result!.secure_url);
                    });
                    uploadStream.end(file.buffer);
                });
            });
            const newImages = await Promise.all(uploadPromises);
            images = [...images, ...newImages];
        }

        const updates = { ...req.body };
        delete updates.sizes;

        if (typeof updates.category === "string") {
            updates.category = updates.category.trim();
        }

        if (updates.price !== undefined) {
            updates.price = Number(updates.price);
        }

        if (updates.comparePrice === "" || updates.comparePrice === null || updates.comparePrice === undefined) {
            updates.comparePrice = null;
        } else {
            updates.comparePrice = Number(updates.comparePrice);
        }

        if (req.body.existingImages || (req.files && (req.files as any).length > 0)) {
            updates.images = images;
        }

        delete updates.existingImages;

        const product = await Product.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        });

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.json({ success: true, data: product });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete product
// DELETE /api/products/:id
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Delete images from Cloudinary
        if (product.images && product.images.length > 0) {
            const deletePromises = product.images.map((imageUrl) => {
                const publicIdMatch = imageUrl.match(/\/v\d+\/(.+)\.[a-z]+$/);
                const publicId = publicIdMatch ? publicIdMatch[1] : null;
                if (publicId) {
                    return cloudinary.uploader.destroy(publicId);
                }
                return Promise.resolve();
            });
            await Promise.all(deletePromises);
        }

        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Product deleted" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

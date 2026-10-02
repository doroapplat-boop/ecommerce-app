import express from "express";
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from "../controllers/productController.js";
import { protect, authorize } from "../middleware/auth.js";
import upload, { uploadArrayIfMultipart } from "../middleware/upload.js";

const ProductRouter = express.Router();

// Get all products
ProductRouter.get("/", getProducts);
// Get single product
ProductRouter.get("/:id", getProduct);
// Create product (Admin only)
ProductRouter.post("/", protect, authorize("admin"), uploadArrayIfMultipart("images", 12), createProduct);
// Update product (Admin only)
ProductRouter.put("/:id", protect, authorize("admin"), uploadArrayIfMultipart("images", 12), updateProduct);
// Delete product (Admin only)
ProductRouter.delete("/:id", protect, authorize("admin"), deleteProduct);

export default ProductRouter;

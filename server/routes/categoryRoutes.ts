import express from "express";
import {
    getCategories,
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
} from "../controllers/categoryController.js";
import { protect, authorize } from "../middleware/auth.js";
import { uploadSingleIfMultipart } from "../middleware/upload.js";

const CategoryRouter = express.Router();

CategoryRouter.get("/", getCategories);
CategoryRouter.get("/all", protect, authorize("admin"), getAllCategories);
CategoryRouter.post("/", protect, authorize("admin"), uploadSingleIfMultipart("image"), createCategory);
CategoryRouter.put("/:id", protect, authorize("admin"), uploadSingleIfMultipart("image"), updateCategory);
CategoryRouter.delete("/:id", protect, authorize("admin"), deleteCategory);

export default CategoryRouter;

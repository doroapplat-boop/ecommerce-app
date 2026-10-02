import express from "express";
import {
    getOrders,
    getOrder,
    createOrder,
    updateOrderStatus,
    getAllOrders,
    cancelOrder,
} from "../controllers/ordersController.js";
import { protect, authorize } from "../middleware/auth.js";
import { uploadSingleIfMultipart } from "../middleware/upload.js";

const OrderRouter = express.Router();

OrderRouter.get("/", protect, getOrders);
OrderRouter.get("/admin/all", protect, authorize("admin"), getAllOrders);
// Flat path so it never conflicts with "/:id"
OrderRouter.post("/cancel/:id", protect, cancelOrder);
OrderRouter.put("/cancel/:id", protect, cancelOrder);
OrderRouter.put("/:id/status", protect, authorize("admin"), updateOrderStatus);
OrderRouter.get("/:id", protect, getOrder);
OrderRouter.post("/", protect, uploadSingleIfMultipart("paymentScreenshot"), createOrder);

export default OrderRouter;

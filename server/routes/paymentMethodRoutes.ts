import express from "express";
import {
    getPaymentMethods,
    getAllPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
} from "../controllers/paymentMethodController.js";
import { protect, authorize } from "../middleware/auth.js";
import { uploadSingleIfMultipart } from "../middleware/upload.js";

const PaymentMethodRouter = express.Router();

PaymentMethodRouter.get("/", getPaymentMethods);
PaymentMethodRouter.get("/all", protect, authorize("admin"), getAllPaymentMethods);
PaymentMethodRouter.post("/", protect, authorize("admin"), uploadSingleIfMultipart("image"), createPaymentMethod);
PaymentMethodRouter.put("/:id", protect, authorize("admin"), uploadSingleIfMultipart("image"), updatePaymentMethod);
PaymentMethodRouter.delete("/:id", protect, authorize("admin"), deletePaymentMethod);

export default PaymentMethodRouter;

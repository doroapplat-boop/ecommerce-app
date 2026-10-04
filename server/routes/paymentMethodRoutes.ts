import express from "express";
import {
    getPaymentMethods,
    getAllPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
} from "../controllers/paymentMethodController.js";
import { protect, authorize, authorizeSuperAdmin } from "../middleware/auth.js";
import { uploadSingleIfMultipart } from "../middleware/upload.js";

const PaymentMethodRouter = express.Router();

// Public list for checkout (customers)
PaymentMethodRouter.get("/", getPaymentMethods);

// Owner-only payment method management
PaymentMethodRouter.get("/all", protect, authorize("admin", "super_admin"), authorizeSuperAdmin, getAllPaymentMethods);
PaymentMethodRouter.post("/", protect, authorize("admin", "super_admin"), authorizeSuperAdmin, uploadSingleIfMultipart("image"), createPaymentMethod);
PaymentMethodRouter.put("/:id", protect, authorize("admin", "super_admin"), authorizeSuperAdmin, uploadSingleIfMultipart("image"), updatePaymentMethod);
PaymentMethodRouter.delete("/:id", protect, authorize("admin", "super_admin"), authorizeSuperAdmin, deletePaymentMethod);

export default PaymentMethodRouter;

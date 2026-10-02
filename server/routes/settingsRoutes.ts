import express from "express";
import { getDeliverySettings, updateDeliverySettings } from "../controllers/settingsController.js";
import { protect, authorize } from "../middleware/auth.js";

const SettingsRouter = express.Router();

SettingsRouter.get("/delivery", getDeliverySettings);
SettingsRouter.put("/delivery", protect, authorize("admin"), updateDeliverySettings);

export default SettingsRouter;

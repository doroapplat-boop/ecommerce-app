import express from "express";
import { addAdmin, getAdmins, getDashboardStats, removeAdmin } from "../controllers/adminController.js";
import { protect, authorize } from "../middleware/auth.js";

const AdminRouter = express.Router();

AdminRouter.get("/stats", protect, authorize("admin"), getDashboardStats);
AdminRouter.get("/admins", protect, authorize("admin"), getAdmins);
AdminRouter.post("/admins", protect, authorize("admin"), addAdmin);
AdminRouter.delete("/admins/:id", protect, authorize("admin"), removeAdmin);

export default AdminRouter;

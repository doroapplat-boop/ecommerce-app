import express from "express";
import {
    addAdmin,
    deleteUserAccount,
    getAdmins,
    getAllUsers,
    getDashboardStats,
    removeAdmin,
} from "../controllers/adminController.js";
import { protect, authorize, authorizeSuperAdmin } from "../middleware/auth.js";

const AdminRouter = express.Router();

AdminRouter.get("/stats", protect, authorize("admin", "super_admin"), getDashboardStats);
AdminRouter.get("/admins", protect, authorize("admin", "super_admin"), authorizeSuperAdmin, getAdmins);
AdminRouter.post("/admins", protect, authorize("admin", "super_admin"), authorizeSuperAdmin, addAdmin);
AdminRouter.delete("/admins/:id", protect, authorize("admin", "super_admin"), authorizeSuperAdmin, removeAdmin);

AdminRouter.get("/users", protect, authorize("admin", "super_admin"), authorizeSuperAdmin, getAllUsers);
AdminRouter.delete("/users/:id", protect, authorize("admin", "super_admin"), authorizeSuperAdmin, deleteUserAccount);

export default AdminRouter;

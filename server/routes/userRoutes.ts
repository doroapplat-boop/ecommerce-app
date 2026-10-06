import express from "express";
import { protect } from "../middleware/auth.js";
import { deleteMyAccountData, getMe } from "../controllers/userController.js";

const UserRouter = express.Router();

UserRouter.get("/me", protect, getMe);
UserRouter.delete("/me", protect, deleteMyAccountData);

export default UserRouter;

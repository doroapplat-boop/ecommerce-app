import express from "express";
import { protect } from "../middleware/auth.js";
import { deleteMyAccountData } from "../controllers/userController.js";

const UserRouter = express.Router();

UserRouter.delete("/me", protect, deleteMyAccountData);

export default UserRouter;

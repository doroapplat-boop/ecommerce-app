import express from "express";
import {
    getBanners,
    getAllBanners,
    createBanner,
    updateBanner,
    deleteBanner,
} from "../controllers/bannerController.js";
import { protect, authorize } from "../middleware/auth.js";
import { uploadSingleIfMultipart } from "../middleware/upload.js";

const BannerRouter = express.Router();

BannerRouter.get("/", getBanners);
BannerRouter.get("/all", protect, authorize("admin"), getAllBanners);
BannerRouter.post("/", protect, authorize("admin"), uploadSingleIfMultipart("image"), createBanner);
BannerRouter.put("/:id", protect, authorize("admin"), uploadSingleIfMultipart("image"), updateBanner);
BannerRouter.delete("/:id", protect, authorize("admin"), deleteBanner);

export default BannerRouter;

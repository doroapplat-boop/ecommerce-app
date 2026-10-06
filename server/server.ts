import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import { clerkMiddleware } from "@clerk/express";
import ProductRouter from "./routes/productsRoutes.js";
import CartRouter from "./routes/cartRoutes.js";
import OrderRouter from "./routes/ordersRoutes.js";
import AddressRouter from "./routes/addressRoutes.js";
import WishlistRouter from "./routes/wishlistRoutes.js";
import AdminRouter from "./routes/adminRoutes.js";
import CategoryRouter from "./routes/categoryRoutes.js";
import BannerRouter from "./routes/bannerRoutes.js";
import PaymentMethodRouter from "./routes/paymentMethodRoutes.js";
import SettingsRouter from "./routes/settingsRoutes.js";
import UserRouter from "./routes/userRoutes.js";
import makeAdmin from "./scripts/makeAdmin.js";
import { clerkWebhook } from "./controllers/webhooks.js";
import { handleStripeWebhook } from "./controllers/paymentController.js";
import paymentRouter from "./routes/paymentRoute.js";
import { seedProducts } from "./scripts/seedProducts.js";
import { seedCategories } from "./scripts/seedCategories.js";
import { seedBanners } from "./scripts/seedBanners.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

await connectDB();

app.post("/api/clerk", express.raw({ type: "application/json" }), clerkWebhook);

app.use(cors());

process.env.STRIPE_SECRET_KEY && app.post("/api/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);

app.use(express.json());
app.use(clerkMiddleware());

// Public legal pages for Google Play (privacy + account deletion)
app.use(express.static(path.join(__dirname, "public")));
app.get("/privacy", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "privacy.html"));
});
app.get("/delete-account", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "delete-account.html"));
});

app.get("/", (req, res) => {
    res.send("Server is running");
});

// Public diagnostics (no secrets) — check Clerk/Render config
app.get("/api/health", (_req, res) => {
    const secret = String(process.env.CLERK_SECRET_KEY || "");
    const publishable = String(process.env.CLERK_PUBLISHABLE_KEY || "");
    const adminEmail = String(process.env.ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL || "")
        .replace(/["']/g, "")
        .trim();

    const clerkMode = secret.startsWith("sk_live_")
        ? "live"
        : secret.startsWith("sk_test_")
          ? "test"
          : secret
            ? "unknown"
            : "missing";

    const publishableMode = publishable.startsWith("pk_live_")
        ? "live"
        : publishable.startsWith("pk_test_")
          ? "test"
          : publishable
            ? "unknown"
            : "missing";

    res.json({
        success: true,
        data: {
            ok: true,
            clerkSecretMode: clerkMode,
            clerkPublishableMode: publishableMode,
            keysMatch: clerkMode === publishableMode && clerkMode !== "missing",
            adminEmailSet: !!adminEmail,
            adminEmailHint: adminEmail
                ? `${adminEmail.slice(0, 3)}***@${adminEmail.split("@")[1] || "?"}`
                : null,
            mongoConfigured: !!process.env.MONGODB_URI,
        },
    });
});

app.use("/api/products", ProductRouter);
app.use("/api/categories", CategoryRouter);
app.use("/api/banners", BannerRouter);
app.use("/api/payment-methods", PaymentMethodRouter);
app.use("/api/settings", SettingsRouter);
app.use("/api/users", UserRouter);
app.use("/api/cart", CartRouter);
app.use("/api/orders", OrderRouter);
app.use("/api/addresses", AddressRouter);
app.use("/api/wishlist", WishlistRouter);
app.use("/api/admin", AdminRouter);
process.env.STRIPE_SECRET_KEY && app.use("/api/payments", paymentRouter);

// Multer / upload errors
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof multer.MulterError) {
        console.error("Multer error:", err.code, err.message);
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ success: false, message: "File too large. Max 10MB per image." });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE" || err.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({ success: false, message: "Too many images. Max 12 allowed." });
        }
        return res.status(400).json({ success: false, message: err.message || "Upload failed" });
    }
    if (err) {
        console.error("Server error:", err);
        return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
    next();
});

const PORT = process.env.PORT || 3000;

try {
    await makeAdmin();
} catch (err) {
    console.error("makeAdmin skipped:", err);
}
try {
    await seedCategories();
    await seedBanners();
    await seedProducts(process.env.MONGODB_URI as string);
} catch (err) {
    console.error("seed skipped:", err);
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

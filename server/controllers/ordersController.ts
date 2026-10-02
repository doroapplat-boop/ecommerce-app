import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import cloudinary from "../config/cloudinary.js";
import { getOrCreateSettings } from "./settingsController.js";
import { Request, Response } from "express";

const uploadScreenshot = (buffer: Buffer) =>
    new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "ecommerce-app/payment-proofs" },
            (error, result) => {
                if (error) reject(error);
                else resolve(result!.secure_url);
            }
        );
        uploadStream.end(buffer);
    });

const parseShippingAddress = (value: any) => {
    if (!value) return null;
    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    }
    return value;
};

// Get user orders
// GET /api/orders
export const getOrders = async (req: Request, res: Response) => {
    try {
        const query = { user: req.user._id };

        const orders = await Order.find(query).populate("items.product", "name images").sort("-createdAt");

        res.json({
            success: true,
            data: orders,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single order
// GET /api/orders/:id
export const getOrder = async (req: Request, res: Response) => {
    try {
        const order = await Order.findById(req.params.id).populate("items.product", "name images");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        res.json({ success: true, data: order });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create order from cart
// POST /api/orders
export const createOrder = async (req: Request, res: Response) => {
    try {
        const shippingAddress = parseShippingAddress(req.body.shippingAddress);
        const notes = req.body.notes;
        const payerName = (req.body.payerName || "").trim();
        const paymentMethod = req.body.paymentMethod || "transfer";
        const paymentMethodIdRaw = (req.body.paymentMethodId || "").trim();
        const paymentMethodName = (req.body.paymentMethodName || "").trim();
        const paymentAccountNumber = (req.body.paymentAccountNumber || "").trim();

        if (!shippingAddress?.city || !shippingAddress?.state) {
            return res.status(400).json({ success: false, message: "Shipping address is required" });
        }

        if (!payerName) {
            return res.status(400).json({ success: false, message: "Payer name is required" });
        }

        if (!paymentMethodName || !paymentAccountNumber) {
            return res.status(400).json({ success: false, message: "Payment method is required" });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Payment screenshot is required" });
        }

        const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        }

        const orderItems = [];
        for (const item of cart.items) {
            const productDoc = item.product as any;
            if (!productDoc || !productDoc._id) {
                return res.status(400).json({
                    success: false,
                    message: "A product in your cart is no longer available",
                });
            }

            const product = await Product.findById(productDoc._id);

            if (!product || product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${productDoc.name || "product"}`,
                });
            }

            orderItems.push({
                product: productDoc._id,
                name: productDoc.name,
                quantity: item.quantity,
                price: item.price,
            });

            product.stock -= item.quantity;
            await product.save();
        }

        let paymentScreenshot = "";
        try {
            paymentScreenshot = await uploadScreenshot(req.file.buffer);
        } catch (uploadErr: any) {
            console.error("Payment screenshot upload failed:", uploadErr);
            return res.status(500).json({
                success: false,
                message: "Failed to upload receipt. Check Cloudinary settings and try again",
            });
        }

        const settings = await getOrCreateSettings();
        const subtotal = cart.totalAmount;
        const shippingCost = Number(settings.deliveryFee) || 0;
        const tax = 0;
        const totalAmount = subtotal + shippingCost + tax;
        const isCod = paymentMethod === "cash_on_delivery";
        const amountPaidOnline = isCod ? shippingCost : totalAmount;
        const amountDueOnDelivery = isCod ? subtotal : 0;

        const orderPayload: any = {
            user: req.user._id,
            items: orderItems,
            shippingAddress,
            paymentMethod,
            paymentMethodName,
            paymentAccountNumber,
            payerName,
            paymentScreenshot,
            paymentStatus: "pending",
            subtotal,
            shippingCost,
            tax,
            totalAmount,
            amountPaidOnline,
            amountDueOnDelivery,
            notes: notes || (isCod ? "Cash on Delivery — delivery fee paid online" : "Placed via App"),
            orderNumber: "ORD-" + Date.now(),
        };

        if (paymentMethodIdRaw && /^[a-fA-F0-9]{24}$/.test(paymentMethodIdRaw)) {
            orderPayload.paymentMethodId = paymentMethodIdRaw;
        }

        const order = await Order.create(orderPayload);

        cart.items = [];
        cart.totalAmount = 0;
        await cart.save();

        res.status(201).json({ success: true, data: order });
    } catch (error: any) {
        console.error("createOrder error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to create order" });
    }
};

// Cancel order (owner)
// PUT|POST /api/orders/:id/cancel
export const cancelOrder = async (req: Request, res: Response) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const orderUserId =
            (order.user as any)?._id?.toString?.() || order.user?.toString?.() || "";
        const requestUserId = req.user?._id?.toString?.() || "";

        if (!orderUserId || orderUserId !== requestUserId) {
            return res.status(403).json({ success: false, message: "Not authorized to cancel this order" });
        }

        if (["shipped", "delivered", "cancelled"].includes(order.orderStatus)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel an order that is ${order.orderStatus}`,
            });
        }

        // Restore stock for cancelled items
        for (const item of order.items) {
            const productId = (item.product as any)?._id || item.product;
            if (!productId) continue;
            await Product.findByIdAndUpdate(productId, {
                $inc: { stock: item.quantity || 0 },
            });
        }

        order.orderStatus = "cancelled";
        await order.save();

        res.json({ success: true, data: order, message: "Order cancelled" });
    } catch (error: any) {
        console.error("cancelOrder error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to cancel order" });
    }
};

// Update order status
// PUT /api/orders/:id/status
export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { orderStatus, paymentStatus } = req.body;

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (orderStatus) order.orderStatus = orderStatus;
        if (paymentStatus) order.paymentStatus = paymentStatus;
        if (orderStatus === "delivered") order.deliveredAt = new Date();

        await order.save();

        res.json({ success: true, data: order });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all orders
// GET /api/orders/admin/all
export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const query: any = {};

        if (status) query.orderStatus = status;

        const total = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .populate("user", "name email")
            .populate("items.product", "name")
            .sort("-createdAt")
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({
            success: true,
            data: orders,
            pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

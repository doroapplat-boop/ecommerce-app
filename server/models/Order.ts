import mongoose from "mongoose";

import { IOrder } from "../types/index.js";

const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: String,
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema<IOrder>(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        orderNumber: { type: String, unique: true },
        items: [orderItemSchema],
        shippingAddress: {
            street: { type: String, default: "" },
            city: { type: String, required: true },
            state: { type: String, required: true },
            phone: { type: String, default: "" },
            zipCode: { type: String, default: "" },
            country: { type: String, default: "" },
        },
        paymentMethod: { type: String, required: true, default: "transfer" },
        paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod" },
        paymentMethodName: { type: String, default: "" },
        paymentAccountNumber: { type: String, default: "" },
        payerName: { type: String, default: "" },
        paymentScreenshot: { type: String, default: "" },
        paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
        paymentIntentId: { type: String },
        orderStatus: { type: String, enum: ["placed", "processing", "shipped", "delivered", "cancelled"], default: "placed" },
        subtotal: { type: Number, required: true },
        shippingCost: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        amountPaidOnline: { type: Number, default: 0 },
        amountDueOnDelivery: { type: Number, default: 0 },
        notes: String,
        deliveredAt: Date,
    },
    { timestamps: true }
);

const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;

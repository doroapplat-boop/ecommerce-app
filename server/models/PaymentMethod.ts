import mongoose from "mongoose";

export interface IPaymentMethod {
    name: string;
    accountName: string;
    image: string;
    accountNumber: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const paymentMethodSchema = new mongoose.Schema<IPaymentMethod>(
    {
        name: { type: String, required: true, trim: true },
        accountName: { type: String, default: "", trim: true },
        image: { type: String, required: true },
        accountNumber: { type: String, required: true, trim: true },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const PaymentMethod = mongoose.model<IPaymentMethod>("PaymentMethod", paymentMethodSchema);

export default PaymentMethod;

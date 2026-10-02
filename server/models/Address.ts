import mongoose from "mongoose";

import { IAddress } from "../types/index.js";

const AddressSchema = new mongoose.Schema<IAddress>({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["Home", "Work", "Other"], default: "Home" },
    street: { type: String, default: "" },
    city: { type: String, required: true },
    state: { type: String, required: true },
    phone: { type: String, default: "" },
    zipCode: { type: String, default: "" },
    country: { type: String, default: "" },
    isDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IAddress>("Address", AddressSchema);

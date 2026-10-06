import mongoose from "mongoose";

const connectDB = async () => {
    const uri = String(process.env.MONGODB_URI || "").trim();
    if (!uri) {
        throw new Error(
            "MONGODB_URI is missing. Add it in Render → Environment, then redeploy."
        );
    }
    mongoose.connection.on("connected", () => {
        console.log("MongoDB connected");
    });
    await mongoose.connect(uri);
};

export default connectDB;

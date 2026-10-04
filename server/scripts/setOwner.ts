/**
 * One-time / anytime: set ADMIN_EMAIL as the only owner, demote others.
 * Run: npx tsx scripts/setOwner.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import makeAdmin from "./makeAdmin.js";

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("Missing MONGODB_URI in server/.env");
        process.exit(1);
    }

    const owner = String(process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "")
        .replace(/["']/g, "")
        .trim();
    console.log("Setting owner to:", owner || "(none)");

    await mongoose.connect(uri);
    await makeAdmin();

    const User = (await import("../models/User.js")).default;
    const admins = await User.find({ role: { $in: ["admin", "super_admin"] } })
        .select("email role name")
        .lean();
    console.log("\nCurrent staff accounts:");
    for (const a of admins) {
        console.log(`- ${a.email || a.name}: ${a.role}`);
    }

    await mongoose.disconnect();
    console.log("\nDone. Sign out of the app, then sign in as the owner email.");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

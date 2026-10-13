import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";

const PRODUCTION_API_URL = "https://ecommerce-app-1qi9.onrender.com/api";

const getDevHost = () => {
    const hostUri =
        Constants.expoConfig?.hostUri ||
        (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
        (Constants as any).manifest?.debuggerHost ||
        "";

    if (typeof hostUri === "string" && hostUri.includes(":")) {
        return hostUri.split(":")[0];
    }
    return "192.168.43.63";
};

const LOCAL_API_URL = Platform.select({
    web: "http://localhost:3000/api",
    android: `http://${getDevHost()}:3000/api`,
    ios: `http://${getDevHost()}:3000/api`,
    default: "http://localhost:3000/api",
});

// Prefer EXPO_PUBLIC_API_URL; otherwise use Render in production, local in dev
const API_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    (__DEV__ ? LOCAL_API_URL : PRODUCTION_API_URL);

const api = axios.create({
    baseURL: API_URL,
    // Render free tier cold-start can take 30–60s+
    timeout: 90000,
});

api.interceptors.response.use(
    (res) => res,
    (error) => {
        const status = error?.response?.status;
        const msg = String(error?.response?.data?.message || "");
        if (status === 401 || msg.toLowerCase().includes("session expired")) {
            error.userMessage = "Session expired. Sign out and sign in again.";
        } else if (status === 500 && msg.includes("Authentication failed")) {
            error.userMessage = "Could not verify login. Sign out and sign in again.";
        }
        return Promise.reject(error);
    }
);

/** Ping API early so Render wakes while splash/home load */
export async function wakeServer(): Promise<boolean> {
    try {
        const base = String(API_URL || "").replace(/\/api\/?$/, "");
        await axios.get(`${base}/api/health`, { timeout: 90000 });
        return true;
    } catch {
        try {
            await api.get("/products", { params: { limit: 1 }, timeout: 90000 });
            return true;
        } catch {
            return false;
        }
    }
}

export default api;

import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";

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

const api = axios.create({
    baseURL: LOCAL_API_URL,
    timeout: 30000,
});

export default api;

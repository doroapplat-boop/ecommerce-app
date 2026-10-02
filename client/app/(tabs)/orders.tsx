import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    FlatList,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Image,
    Alert,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import Header from "@/components/Header";
import api from "@/constants/api";
import { COLORS, formatPrice } from "@/constants";
import type { Order } from "@/constants/types";
import { useAuth } from "@clerk/clerk-expo";
import { formatDate } from "@/assets/assets";

type TabKey = "active" | "history";

const ACTIVE_STATUSES = ["placed", "processing", "shipped"];
const HISTORY_STATUSES = ["delivered", "cancelled"];

const statusLabel = (status: string) => {
    switch (status) {
        case "placed":
            return "Confirmed";
        case "processing":
            return "Processing";
        case "shipped":
            return "Shipped";
        case "delivered":
            return "Finished";
        case "cancelled":
            return "Cancelled";
        default:
            return status;
    }
};

const statusBadgeStyle = (status: string) => {
    switch (status) {
        case "placed":
            return { bg: "#DBEAFE", text: "#1E40AF" };
        case "processing":
            return { bg: "#E0E7FF", text: "#3730A3" };
        case "shipped":
            return { bg: "#F3E8FF", text: "#6B21A8" };
        case "delivered":
            return { bg: "#DCFCE7", text: "#166534" };
        case "cancelled":
            return { bg: "#FEE2E2", text: "#991B1B" };
        default:
            return { bg: "#F3F4F6", text: "#374151" };
    }
};

export default function TabOrders() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [tab, setTab] = useState<TabKey>("active");
    const { getToken, isSignedIn } = useAuth();

    const fetchOrders = async () => {
        if (!isSignedIn) {
            setOrders([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const token = await getToken();
            const { data } = await api.get("/orders", { headers: { Authorization: `Bearer ${token}` } });
            setOrders(data.data || []);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchOrders();
        }, [isSignedIn])
    );

    const filteredOrders = useMemo(() => {
        if (tab === "active") {
            return orders.filter((o) => ACTIVE_STATUSES.includes(o.orderStatus));
        }
        return orders.filter((o) => HISTORY_STATUSES.includes(o.orderStatus));
    }, [orders, tab]);

    const canCancel = (status: string) => status === "placed" || status === "processing";

    const performCancel = async (orderId: string) => {
        try {
            setCancellingId(orderId);
            const token = await getToken();
            if (!token) {
                Toast.show({ type: "error", text1: "Please sign in again" });
                return;
            }
            const { data } = await api.post(
                `/orders/cancel/${orderId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.success) {
                Toast.show({ type: "success", text1: "Order cancelled" });
                fetchOrders();
            } else {
                Toast.show({
                    type: "error",
                    text1: "Cancel failed",
                    text2: data.message || "Please try again",
                });
            }
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Cancel failed",
                text2:
                    error.response?.data?.message ||
                    error.message ||
                    (error.response?.status ? `Error ${error.response.status}` : "Something went wrong"),
            });
            console.error("Cancel order failed:", error.response?.status, error.response?.data || error.message);
        } finally {
            setCancellingId(null);
        }
    };

    const confirmCancel = (orderId: string) => {
        if (Platform.OS === "web") {
            if (window.confirm("Cancel this order?")) performCancel(orderId);
            return;
        }
        Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
            { text: "No", style: "cancel" },
            { text: "Yes, Cancel", style: "destructive", onPress: () => performCancel(orderId) },
        ]);
    };

    const renderOrder = ({ item }: { item: Order }) => {
        const firstItem: any = item.items?.[0];
        const image = firstItem?.product?.images?.[0];
        const title =
            firstItem?.product?.name ||
            firstItem?.name ||
            `Order #${item.orderNumber}`;
        const badge = statusBadgeStyle(item.orderStatus);
        const showCancel = tab === "active" && canCancel(item.orderStatus);

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push(`/orders/${item._id}`)}
                className="bg-white rounded-2xl mb-3 border border-gray-200 overflow-hidden"
                style={{ padding: 12 }}
            >
                <View className="flex-row">
                    <View className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden mr-3">
                        {image ? (
                            <Image source={{ uri: image }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                            <View className="w-full h-full items-center justify-center">
                                <Ionicons name="image-outline" size={24} color={COLORS.secondary} />
                            </View>
                        )}
                    </View>

                    <View className="flex-1">
                        <Text className="font-bold text-base mb-1" style={{ color: "#111" }} numberOfLines={2}>
                            {title}
                            {item.items.length > 1 ? ` +${item.items.length - 1}` : ""}
                        </Text>

                        <View className="flex-row items-center mb-2">
                            <Ionicons name="time-outline" size={14} color="#6B7280" />
                            <Text className="text-xs ml-1" style={{ color: "#6B7280" }}>
                                {formatDate(item.createdAt)}
                            </Text>
                        </View>

                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center flex-1 mr-2" style={{ gap: 6 }}>
                                <View
                                    className="px-2.5 py-1 rounded-md"
                                    style={{ backgroundColor: badge.bg }}
                                >
                                    <Text className="text-xs font-bold" style={{ color: badge.text }}>
                                        {statusLabel(item.orderStatus)}
                                    </Text>
                                </View>
                                {item.paymentMethod === "cash_on_delivery" && (
                                    <View
                                        className="px-2 py-1 rounded-md"
                                        style={{ backgroundColor: "#ECFDF5" }}
                                    >
                                        <Text className="text-xs font-bold" style={{ color: "#166534" }}>
                                            COD
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text className="font-bold text-base" style={{ color: COLORS.primary }}>
                                {formatPrice(item.totalAmount)}
                            </Text>
                        </View>
                        {item.paymentMethod === "cash_on_delivery" && (
                            <Text className="text-xs mt-1.5" style={{ color: "#6B7280" }}>
                                Delivery {formatPrice(item.shippingCost)} paid · Due{" "}
                                {formatPrice(item.amountDueOnDelivery ?? item.subtotal)}
                            </Text>
                        )}
                    </View>
                </View>

                {showCancel && (
                    <View className="flex-row mt-3 pt-3 border-t border-gray-100 gap-2">
                        <TouchableOpacity
                            onPress={() => router.push(`/orders/${item._id}`)}
                            className="flex-1 py-2.5 rounded-xl border items-center"
                            style={{ borderColor: COLORS.primary }}
                        >
                            <Text className="font-bold" style={{ color: COLORS.primary }}>
                                View
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => confirmCancel(item._id)}
                            disabled={cancellingId === item._id}
                            className="flex-1 py-2.5 rounded-xl items-center"
                            style={{ backgroundColor: "#FEE2E2" }}
                        >
                            {cancellingId === item._id ? (
                                <ActivityIndicator size="small" color="#991B1B" />
                            ) : (
                                <Text className="font-bold" style={{ color: "#991B1B" }}>
                                    Cancel
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
            <Header title="Orders" showMenu showWishlist />

            {!isSignedIn ? (
                <View className="flex-1 justify-center items-center px-6">
                    <Text className="text-secondary text-lg mb-4">Please sign in to see your orders</Text>
                    <TouchableOpacity onPress={() => router.push("/sign-in")} className="bg-primary px-6 py-3 rounded-full">
                        <Text className="text-white font-bold">Sign In</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <View className="px-4 pt-2 pb-3">
                        <View className="flex-row bg-gray-100 rounded-2xl p-1">
                            <TouchableOpacity
                                onPress={() => setTab("active")}
                                className="flex-1 py-3 rounded-xl items-center"
                                style={{ backgroundColor: tab === "active" ? COLORS.primary : "transparent" }}
                            >
                                <Text
                                    className="font-bold"
                                    style={{ color: tab === "active" ? "#fff" : "#111" }}
                                >
                                    Active Orders
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setTab("history")}
                                className="flex-1 py-3 rounded-xl items-center"
                                style={{ backgroundColor: tab === "history" ? COLORS.primary : "transparent" }}
                            >
                                <Text
                                    className="font-bold"
                                    style={{ color: tab === "history" ? "#fff" : "#111" }}
                                >
                                    Order History
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {loading ? (
                        <View className="flex-1 justify-center items-center">
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredOrders}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={{ padding: 16, paddingTop: 4, flexGrow: 1 }}
                            renderItem={renderOrder}
                            ListEmptyComponent={
                                <View className="flex-1 justify-center items-center py-20">
                                    <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
                                    <Text className="text-secondary mt-3">
                                        {tab === "active" ? "No active orders" : "No order history"}
                                    </Text>
                                </View>
                            }
                        />
                    )}
                </>
            )}
        </SafeAreaView>
    );
}

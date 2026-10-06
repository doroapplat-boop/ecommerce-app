import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import api from "@/constants/api";
import { COLORS, getStatusColor, formatPrice, isOwnerAccount } from "@/constants";

type AdminMenuItem = {
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: string;
    ownerOnly?: boolean;
};

const ADMIN_MENU: AdminMenuItem[] = [
    { title: "Dashboard", subtitle: "Overview & recent orders", icon: "grid-outline", route: "/admin" },
    { title: "Products", subtitle: "Add and manage products", icon: "cube-outline", route: "/admin/products" },
    { title: "Orders", subtitle: "Track and update orders", icon: "receipt-outline", route: "/admin/orders" },
    { title: "Categories", subtitle: "Organize product categories", icon: "albums-outline", route: "/admin/categories" },
    { title: "Banners", subtitle: "Home screen banners", icon: "images-outline", route: "/admin/banners" },
    { title: "Delivery", subtitle: "Delivery fee settings", icon: "bicycle-outline", route: "/admin/delivery" },
    { title: "Payments", subtitle: "Payment methods", icon: "wallet-outline", route: "/admin/payments", ownerOnly: true },
    { title: "Admins", subtitle: "Manage admin accounts", icon: "people-outline", route: "/admin/admins", ownerOnly: true },
    { title: "Users", subtitle: "See all emails & delete accounts", icon: "person-outline", route: "/admin/users", ownerOnly: true },
];

export default function AdminDashboard() {
    const router = useRouter();
    const { getToken } = useAuth();
    const { user } = useUser();
    const isOwner = isOwnerAccount(user);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        recentOrders: []
    });

    const menuItems = useMemo(
        () => ADMIN_MENU.filter((item) => !item.ownerOnly || isOwner),
        [isOwner]
    );

    const fetchStats = async () => {
        try {
            const token = await getToken();
            if (!token) {
                Toast.show({
                    type: "error",
                    text1: "Session expired",
                    text2: "Please sign in again",
                });
                return;
            }
            const { data } = await api.get("/admin/stats", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) {
                setStats(data.data);
            }
        } catch (error: any) {
            const status = error?.response?.status;
            const message =
                error?.response?.data?.message ||
                (status === 403
                    ? "No admin permission on server"
                    : status === 401
                      ? "Please sign in again"
                      : "Cannot reach server. Check internet / API.");
            Toast.show({
                type: "error",
                text1: "Could not load dashboard",
                text2: message,
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-surface">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-surface p-4"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ paddingBottom: 40 }}
        >
            <View className="mb-6">
                <Text className="text-secondary text-xs font-bold mb-2 uppercase px-1">Admin Menu</Text>
                <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    {menuItems.map((item, index) => {
                        const isCurrent = item.route === "/admin";
                        return (
                            <TouchableOpacity
                                key={item.route}
                                disabled={isCurrent}
                                onPress={() => router.push(item.route as any)}
                                className={`flex-row items-center p-4 ${
                                    index !== menuItems.length - 1 ? "border-b border-gray-100" : ""
                                }`}
                                activeOpacity={0.7}
                            >
                                <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
                                    <Ionicons name={item.icon} size={20} color={COLORS.primary} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-primary font-medium">{item.title}</Text>
                                    <Text className="text-secondary text-xs mt-0.5">{item.subtitle}</Text>
                                </View>
                                {isCurrent ? (
                                    <View className="bg-primary/10 px-2 py-1 rounded">
                                        <Text className="text-primary text-[10px] font-bold">NOW</Text>
                                    </View>
                                ) : (
                                    <Ionicons name="chevron-forward" size={18} color={COLORS.secondary} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <View className="mb-8">
                <Text className="text-primary font-bold text-2xl mb-4 tracking-tight">Overview</Text>
                <View className="flex-row flex-wrap justify-between">
                    <StatCard label="Total Revenue" value={formatPrice(stats.totalRevenue)} />
                    <StatCard label="Total Orders" value={stats.totalOrders.toString()} />
                    <StatCard label="Products" value={stats.totalProducts.toString()} />
                    <StatCard label="Users" value={stats.totalUsers.toString()} />
                </View>
            </View>

            <View className="mb-6">
                <Text className="text-primary font-bold text-2xl mb-4 tracking-tight">Recent Orders</Text>
                {stats.recentOrders.length === 0 ? (
                    <View className="bg-white p-6 rounded-2xl border border-gray-100 items-center">
                        <Text className="text-secondary">No recent orders</Text>
                    </View>
                ) : (
                    stats.recentOrders.map((order: any) => (
                        <View key={order._id} className="bg-white p-5 rounded-2xl border border-gray-100 mb-3">
                            <View className="flex-row justify-between items-center mb-3">
                                <View>
                                    <Text className="font-bold text-primary text-base">Total Products : {order.items.reduce((acc: number, item: any) => acc + item.quantity, 0)}</Text>
                                    <Text className="text-secondary text-xs mt-1">{new Date(order.createdAt).toLocaleDateString()}</Text>
                                </View>
                                <View className={`px-3 py-1.5 rounded-full ${getStatusColor(order.orderStatus)}`}>
                                    <Text className="text-[10px] font-bold uppercase">{order.orderStatus}</Text>
                                </View>
                            </View>
                            <View className="pb-2">
                                {order.items.map((item: any) => (
                                    <Text key={item._id} className="text-secondary text-xs mt-1">{item.name} x {item.quantity}</Text>
                                ))}
                            </View>

                            <View className="h-[1px] bg-gray-100 mb-3" />

                            <View className="flex-row justify-between items-center">
                                <View className="flex-row items-center">
                                    <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-2">
                                        <Text className="text-primary font-bold text-xs">
                                            {(order.user?.name || '?').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text className="text-secondary text-sm">{order.user?.name || 'Unknown User'}</Text>
                                </View>
                                <Text className="text-primary font-bold text-lg">{formatPrice(order.totalAmount)}</Text>
                            </View>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const StatCard = ({ label, value }: { label: string, value: string }) => (
    <View className="bg-white p-5 rounded-2xl border border-gray-100 w-[48%] mb-4 justify-center">
        <Text className="text-xl font-bold text-primary mb-1">{value}</Text>
        <Text className="text-secondary text-xs font-medium uppercase tracking-wide">{label}</Text>
    </View>
);

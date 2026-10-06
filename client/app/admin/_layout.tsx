import { Tabs, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useEffect, useMemo } from "react";
import { View, ActivityIndicator, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, isOwnerAccount, isStaffAccount } from "@/constants";

export default function AdminLayout() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const isStaff = isStaffAccount(user);
    const isOwner = isOwnerAccount(user);

    useEffect(() => {
        if (isLoaded && (!user || !isStaff)) {
            router.replace("/(tabs)");
        }
    }, [isLoaded, user, isStaff]);

    const ownerOnlyHref = useMemo(() => (isOwner ? undefined : null), [isOwner]);

    if (!isLoaded) {
        return (
            <View className="flex-1 justify-center items-center bg-surface">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!user || !isStaff) return null;

    return (
        <Tabs
            screenOptions={{
                headerStyle: {
                    backgroundColor: "#fff",
                },
                headerTintColor: COLORS.primary,
                headerTitleStyle: {
                    fontWeight: "bold",
                },
                headerShadowVisible: false,
                tabBarStyle: { display: "none" },
                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => router.replace("/admin")}
                        className="ml-4 flex-row items-center"
                    >
                        <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                ),
                headerRight: () => (
                    <TouchableOpacity
                        onPress={() => router.replace("/(tabs)")}
                        className="mr-4 flex-row items-center"
                    >
                        <Ionicons name="log-out-outline" size={22} color={COLORS.primary} />
                        <Text className="ml-1 text-primary font-medium">Exit</Text>
                    </TouchableOpacity>
                ),
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Admin",
                    headerLeft: () => null,
                }}
            />
            <Tabs.Screen name="products" options={{ title: "Products" }} />
            <Tabs.Screen name="orders" options={{ title: "Orders" }} />
            <Tabs.Screen name="categories" options={{ title: "Categories" }} />
            <Tabs.Screen name="banners" options={{ title: "Banners" }} />
            <Tabs.Screen name="delivery" options={{ title: "Delivery" }} />
            <Tabs.Screen
                name="payments"
                options={{
                    title: "Payments",
                    href: ownerOnlyHref as any,
                }}
            />
            <Tabs.Screen
                name="admins"
                options={{
                    title: "Admins",
                    href: ownerOnlyHref as any,
                }}
            />
            <Tabs.Screen
                name="users"
                options={{
                    title: "Users",
                    href: ownerOnlyHref as any,
                }}
            />
        </Tabs>
    );
}

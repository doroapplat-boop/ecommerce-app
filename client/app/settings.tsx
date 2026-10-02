import { Ionicons } from "@expo/vector-icons";
import { useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import Header from "@/components/Header";
import { COLORS } from "@/constants";

export default function Settings() {
    const router = useRouter();
    const { user, signOut } = useClerk();
    const [notifications, setNotifications] = useState(true);
    const [orderUpdates, setOrderUpdates] = useState(true);

    const handleLogout = async () => {
        await signOut();
        router.replace("/sign-in");
    };

    const confirmLogout = () => {
        if (Platform.OS === "web") {
            if (window.confirm("Log out of your account?")) handleLogout();
            return;
        }
        Alert.alert("Log Out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Log Out", style: "destructive", onPress: handleLogout },
        ]);
    };

    const Row = ({
        icon,
        title,
        subtitle,
        onPress,
        right,
    }: {
        icon: keyof typeof Ionicons.glyphMap;
        title: string;
        subtitle?: string;
        onPress?: () => void;
        right?: React.ReactNode;
    }) => (
        <TouchableOpacity
            disabled={!onPress && !right}
            onPress={onPress}
            className="flex-row items-center p-4 border-b border-gray-100"
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
                <Ionicons name={icon} size={20} color={COLORS.primary} />
            </View>
            <View className="flex-1">
                <Text className="text-primary font-medium">{title}</Text>
                {!!subtitle && <Text className="text-secondary text-xs mt-0.5">{subtitle}</Text>}
            </View>
            {right || (onPress ? <Ionicons name="chevron-forward" size={18} color={COLORS.secondary} /> : null)}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
            <Header title="Settings" showBack />

            <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
                <Text className="text-secondary text-xs font-bold mb-2 uppercase px-1">Account</Text>
                <View className="bg-white rounded-xl border border-gray-100 mb-5 overflow-hidden">
                    <Row
                        icon="person-outline"
                        title={user?.fullName || "Profile"}
                        subtitle={
                            user?.emailAddresses?.[0]?.emailAddress ||
                            user?.primaryPhoneNumber?.phoneNumber ||
                            "Signed in"
                        }
                    />
                    <Row
                        icon="location-outline"
                        title="Shipping Addresses"
                        subtitle="Manage delivery addresses"
                        onPress={() => router.push("/addresses")}
                    />
                    <Row
                        icon="receipt-outline"
                        title="My Orders"
                        subtitle="Track and view orders"
                        onPress={() => router.push("/orders")}
                    />
                </View>

                <Text className="text-secondary text-xs font-bold mb-2 uppercase px-1">Preferences</Text>
                <View className="bg-white rounded-xl border border-gray-100 mb-5 overflow-hidden">
                    <Row
                        icon="notifications-outline"
                        title="Push Notifications"
                        subtitle="General app alerts"
                        right={
                            <Switch
                                value={notifications}
                                onValueChange={(value) => {
                                    setNotifications(value);
                                    Toast.show({
                                        type: "success",
                                        text1: value ? "Notifications on" : "Notifications off",
                                    });
                                }}
                                trackColor={{ false: "#e5e7eb", true: COLORS.primary }}
                            />
                        }
                    />
                    <Row
                        icon="cube-outline"
                        title="Order Updates"
                        subtitle="Status and delivery alerts"
                        right={
                            <Switch
                                value={orderUpdates}
                                onValueChange={(value) => {
                                    setOrderUpdates(value);
                                    Toast.show({
                                        type: "success",
                                        text1: value ? "Order updates on" : "Order updates off",
                                    });
                                }}
                                trackColor={{ false: "#e5e7eb", true: COLORS.primary }}
                            />
                        }
                    />
                    <Row
                        icon="heart-outline"
                        title="Favorites"
                        subtitle="Saved products"
                        onPress={() => router.push("/(tabs)/favorites")}
                    />
                </View>

                <Text className="text-secondary text-xs font-bold mb-2 uppercase px-1">Support</Text>
                <View className="bg-white rounded-xl border border-gray-100 mb-5 overflow-hidden">
                    <Row
                        icon="help-circle-outline"
                        title="Help & Support"
                        subtitle="Get help with your orders"
                        onPress={() =>
                            Toast.show({
                                type: "success",
                                text1: "Support",
                                text2: "Contact us through your order phone details",
                            })
                        }
                    />
                    <Row
                        icon="information-circle-outline"
                        title="About"
                        subtitle="Gguzo · Version 1.0.0"
                        onPress={() =>
                            Toast.show({
                                type: "success",
                                text1: "Gguzo",
                                text2: "Version 1.0.0",
                            })
                        }
                    />
                </View>

                <TouchableOpacity
                    onPress={confirmLogout}
                    className="bg-white rounded-xl border border-red-100 p-4 items-center mb-4"
                >
                    <Text className="text-red-500 font-bold">Log Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

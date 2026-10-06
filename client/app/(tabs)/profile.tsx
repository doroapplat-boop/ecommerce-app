import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import { COLORS, PROFILE_MENU, isStaffAccount } from "@/constants";
import { useClerk } from "@clerk/clerk-expo";

export default function Profile() {
    const router = useRouter();
    const { user, signOut } = useClerk();
    const showAdmin = isStaffAccount(user);

    const handleLogout = async () => {
        await signOut();
        router.replace("/sign-in");
    };

    const onMenuPress = (route: string) => {
        router.push(route as any);
    };

    return (
        <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
            <StatusBar style="dark" />
            <Header title="Profile" />

            <ScrollView className="flex-1 px-4" contentContainerStyle={!user ? { flex: 1, justifyContent: "center", alignItems: "center" } : { paddingTop: 16 }}>
                {!user ? (
                    <View className="items-center w-full">
                        <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center mb-6">
                            <Ionicons name="person" size={40} color={COLORS.secondary} />
                        </View>
                        <Text className="text-primary font-bold text-xl mb-2">Guest User</Text>
                        <Text className="text-secondary text-base mb-8 text-center w-3/4 px-4">Log in to view your profile, orders, and addresses.</Text>
                        <TouchableOpacity onPress={() => router.push("/sign-in")} className="bg-primary w-3/5 py-3 rounded-full items-center shadow-lg">
                            <Text className="text-white font-bold text-lg">Login / Sign Up</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push("/support")}
                            className="mt-6 flex-row items-center bg-white border border-gray-100 px-5 py-3 rounded-full"
                        >
                            <Ionicons name="headset-outline" size={18} color={COLORS.primary} />
                            <Text className="text-primary font-medium ml-2">Help Center</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View className="items-center mb-8">
                            <View className="relative">
                                <View className="mb-3 ">
                                    <Image source={{ uri: user.imageUrl }} className="size-20 border-2 border-white shadow-sm rounded-full" />
                                </View>
                            </View>
                            <Text className="text-xl font-bold text-primary">{user.firstName + " " + user.lastName}</Text>
                            <Text className="text-secondary text-sm">
                                {user.emailAddresses?.[0]?.emailAddress || user.primaryPhoneNumber?.phoneNumber || user.phoneNumbers?.[0]?.phoneNumber}
                            </Text>
                        </View>

                        {showAdmin && (
                            <View className="bg-white rounded-xl border border-gray-100/75 p-2 mb-4">
                                <TouchableOpacity
                                    onPress={() => router.push("/admin")}
                                    className="flex-row items-center p-4"
                                >
                                    <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
                                        <Ionicons name="shield-outline" size={20} color={COLORS.primary} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-primary font-medium">Admin Panel</Text>
                                        <Text className="text-secondary text-xs mt-0.5">
                                            Dashboard, products, orders & more
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View className="bg-white rounded-xl border border-gray-100/75 p-2 mb-4">
                            {PROFILE_MENU.map((item, index) => (
                                <TouchableOpacity
                                    key={item.id}
                                    onPress={() => onMenuPress(item.route)}
                                    className={`flex-row items-center p-4 ${index !== PROFILE_MENU.length - 1 ? "border-b border-gray-100" : ""}`}
                                >
                                    <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
                                        <Ionicons name={item.icon as any} size={20} color={COLORS.primary} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-primary font-medium">{item.title}</Text>
                                        {"subtitle" in item && !!(item as any).subtitle && (
                                            <Text className="text-secondary text-xs mt-0.5">{(item as any).subtitle}</Text>
                                        )}
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity className="flex-row items-center justify-center p-4" onPress={handleLogout}>
                            <Text className="text-red-500 font-bold ml-2">Log Out</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

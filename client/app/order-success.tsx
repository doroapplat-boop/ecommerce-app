import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@/constants";

export default function OrderSuccess() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: "#F3F4F6" }}>
            <View className="flex-1 items-center justify-center px-6">
                <View
                    className="w-full bg-white items-center"
                    style={{
                        borderRadius: 20,
                        paddingHorizontal: 24,
                        paddingTop: 36,
                        paddingBottom: 28,
                    }}
                >
                    <Text style={{ fontSize: 64, marginBottom: 20 }}>🎉</Text>

                    <Text
                        className="text-center font-bold mb-2"
                        style={{ color: COLORS.primary, fontSize: 22 }}
                    >
                        Order placed successfully
                    </Text>
                    <Text
                        className="text-center mb-8"
                        style={{ color: COLORS.primary, fontSize: 15, opacity: 0.85 }}
                    >
                        Thank you for shopping with us
                    </Text>

                    <TouchableOpacity
                        onPress={() => router.replace("/(tabs)")}
                        activeOpacity={0.85}
                        className="w-full items-center"
                        style={{
                            backgroundColor: COLORS.primary,
                            borderRadius: 12,
                            paddingVertical: 16,
                        }}
                    >
                        <Text className="text-white font-bold text-base">Continue Shopping</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

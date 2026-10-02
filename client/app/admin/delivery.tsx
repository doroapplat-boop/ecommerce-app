import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { COLORS, formatPrice } from "@/constants";

export default function AdminDelivery() {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState("2");

    const fetchFee = async () => {
        try {
            const { data } = await api.get("/settings/delivery");
            if (data.success) {
                setDeliveryFee(String(data.data.deliveryFee ?? 2));
            }
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Failed to load delivery fee",
                text2: error.response?.data?.message || "Something went wrong",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFee();
    }, []);

    const handleSave = async () => {
        const fee = Number(deliveryFee);
        if (Number.isNaN(fee) || fee < 0) {
            Toast.show({ type: "error", text1: "Enter a valid delivery fee" });
            return;
        }

        try {
            setSaving(true);
            const token = await getToken();
            const { data } = await api.put(
                "/settings/delivery",
                { deliveryFee: fee },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.success) {
                setDeliveryFee(String(data.data.deliveryFee));
                Toast.show({ type: "success", text1: "Delivery fee updated" });
            }
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Save failed",
                text2: error.response?.data?.message || "Something went wrong",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-surface">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-surface p-4">
            <View className="bg-white rounded-2xl border border-gray-100 p-5">
                <Text className="text-lg font-bold text-primary mb-1">Delivery Payment</Text>
                <Text className="text-secondary text-sm mb-5">
                    This fee is shown in cart, checkout, payment, and orders.
                </Text>

                <Text className="text-primary font-medium mb-2">Delivery fee (birr)</Text>
                <TextInput
                    className="bg-surface p-4 rounded-xl text-primary mb-2 border border-gray-100"
                    keyboardType="decimal-pad"
                    value={deliveryFee}
                    onChangeText={setDeliveryFee}
                    placeholder="e.g. 2"
                />
                <Text className="text-secondary text-xs mb-6">
                    Current preview: {formatPrice(Number(deliveryFee) || 0)}
                </Text>

                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    className={`bg-primary py-4 rounded-full items-center ${saving ? "opacity-70" : ""}`}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text className="text-white font-bold text-base">Save Delivery Fee</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

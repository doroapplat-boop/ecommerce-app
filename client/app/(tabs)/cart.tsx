import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CartItem from "@/components/CartItem";
import Header from "@/components/Header";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/constants";
import api from "@/constants/api";

export default function Cart() {
    const router = useRouter();
    const { cartItems, cartTotal, removeFromCart, updateQuantity } = useCart();
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [deliveryFee, setDeliveryFee] = useState(2);

    useEffect(() => {
        api.get("/settings/delivery")
            .then(({ data }) => {
                if (data.success) setDeliveryFee(Number(data.data.deliveryFee) || 0);
            })
            .catch(() => {});
    }, []);

    const total = cartTotal + deliveryFee;

    const handleRemove = async (id: string) => {
        if (removingId) return;
        setRemovingId(id);
        try {
            await removeFromCart(id);
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
            <Header title="My Cart" showBack />

            {cartItems.length > 0 ? (
                <>
                    <ScrollView className="flex-1 px-4 mt-4" showsVerticalScrollIndicator={false}>
                        {cartItems.map((item) => (
                            <CartItem
                                key={item.id}
                                item={item}
                                removing={removingId === item.id}
                                onRemove={() => handleRemove(item.id)}
                                onUpdateQuantity={(qty) => updateQuantity(item.id, qty)}
                            />
                        ))}
                    </ScrollView>

                    <View className="p-4 bg-white rounded-t-3xl shadow-sm">
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-secondary">Subtotal</Text>
                            <Text className="text-primary font-bold">{formatPrice(cartTotal)}</Text>
                        </View>
                        <View className="flex-row justify-between mb-4">
                            <Text className="text-secondary">Delivery</Text>
                            <Text className="text-primary font-bold">{formatPrice(deliveryFee)}</Text>
                        </View>
                        <View className="h-[1px] bg-border mb-4" />
                        <View className="flex-row justify-between mb-6">
                            <Text className="text-primary font-bold text-lg">Total</Text>
                            <Text className="text-primary font-bold text-lg">{formatPrice(total)}</Text>
                        </View>

                        <TouchableOpacity
                            className="bg-primary py-4 rounded-full items-center"
                            onPress={() => router.push("/checkout")}
                        >
                            <Text className="text-white font-bold text-base">Checkout</Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <View className="flex-1 items-center justify-center">
                    <Text className="text-secondary text-lg">Your cart is empty</Text>
                    <TouchableOpacity onPress={() => router.push("/")} className="mt-4">
                        <Text className="text-primary font-bold">Start Shopping</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

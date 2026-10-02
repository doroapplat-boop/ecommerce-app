import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native";
import { COLORS, formatPrice } from "@/constants";
import type { CartItemProps } from "@/constants/types";

export default function CartItem({ item, onRemove, onUpdateQuantity, removing }: CartItemProps) {
    const imageUrl = item.product.images[0];

    return (
        <View className="flex-row mb-4 bg-white p-3 rounded-xl">
            <View className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden mr-3">
                <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
            </View>

            <View className="flex-1 justify-between">
                <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-2">
                        <Text className="font-bold text-sm mb-1" style={{ color: "#000000" }} numberOfLines={2}>
                            {item.product.name}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={onRemove}
                        disabled={removing}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}
                    >
                        {removing ? (
                            <ActivityIndicator size="small" color="#FF4C3B" />
                        ) : (
                            <Ionicons name="close-circle-outline" size={22} color="#FF4C3B" />
                        )}
                    </TouchableOpacity>
                </View>

                <View className="flex-row justify-between items-center mt-2">
                    <Text className="font-bold text-base" style={{ color: "#000000" }}>
                        {formatPrice(item.product.price)}
                    </Text>

                    <View className="flex-row items-center bg-surface rounded-full px-2 py-1">
                        <TouchableOpacity
                            className="p-1"
                            disabled={removing}
                            onPress={() => onUpdateQuantity && onUpdateQuantity(item.quantity - 1)}
                        >
                            <Ionicons name="remove" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                        <Text className="text-primary font-medium mx-3">{item.quantity}</Text>
                        <TouchableOpacity
                            className="p-1"
                            disabled={removing}
                            onPress={() => onUpdateQuantity && onUpdateQuantity(item.quantity + 1)}
                        >
                            <Ionicons name="add" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

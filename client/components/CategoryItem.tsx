import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "@/constants";
import type { CategoryItemProps } from "@/constants/types";

export default function CategoryItem({ item, isSelected, onPress }: CategoryItemProps) {
    return (
        <TouchableOpacity className="mr-5 items-center" onPress={onPress} style={{ width: 86 }}>
            <View
                className={`rounded-full items-center justify-center mb-2 overflow-hidden ${
                    isSelected ? "bg-primary" : "bg-gray-100"
                }`}
                style={{
                    width: 78,
                    height: 78,
                    borderWidth: isSelected ? 0 : 1,
                    borderColor: "#E5E7EB",
                }}
            >
                {item.image ? (
                    <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" />
                ) : (
                    <Ionicons
                        name={(item.icon || "apps-outline") as any}
                        size={30}
                        color={isSelected ? "#FFF" : COLORS.primary}
                    />
                )}
            </View>
            <Text
                className="text-xs font-medium text-center"
                numberOfLines={2}
                style={{ color: isSelected ? COLORS.primary : "#111" }}
            >
                {item.name}
            </Text>
        </TouchableOpacity>
    );
}

import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "@/constants";
import type { ProductCardProps } from "@/constants/types";
import { useWishlist } from "@/context/WishlistContext";

const TEXT_BLACK = "#000000";
const TEXT_MUTED = "#9CA3AF";

export default function ProductCard({ product }: ProductCardProps) {
    const { toggleWishlist, isInWishlist } = useWishlist();
    const isLiked = isInWishlist(product._id);
    const hasDiscount = !!product.comparePrice && Number(product.comparePrice) > Number(product.price);

    return (
        <Link href={`/product/${product._id}`} asChild>
            <TouchableOpacity className="w-[48%] mb-4 bg-white rounded-lg overflow-hidden">
                <View className="relative h-40 w-full bg-gray-100">
                    <Image source={{ uri: product.images[0] }} className="w-full h-full" resizeMode="cover" />
                    <TouchableOpacity
                        className="absolute top-2 right-2 z-10 p-2 bg-white rounded-full shadow-sm"
                        onPress={(e) => {
                            e.stopPropagation();
                            toggleWishlist(product);
                        }}
                    >
                        <Ionicons
                            name={isLiked ? "heart" : "heart-outline"}
                            size={20}
                            color={isLiked ? COLORS.accent : COLORS.primary}
                        />
                    </TouchableOpacity>

                    {product.isFeatured && (
                        <View className="absolute top-2 left-2 bg-black px-2 py-1 rounded">
                            <Text className="text-white text-xs font-bold uppercase">Featured</Text>
                        </View>
                    )}
                </View>

                <View className="p-3">
                    <Text
                        numberOfLines={1}
                        style={{ color: TEXT_BLACK, fontSize: 14, fontWeight: "700", marginBottom: 4 }}
                    >
                        {product.name}
                    </Text>
                    <View className="flex-row items-center flex-wrap">
                        <Text style={{ color: TEXT_BLACK, fontSize: 15, fontWeight: "700", marginRight: 8 }}>
                            {Number(product.price).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}{" "}
                            birr
                        </Text>
                        {hasDiscount && (
                            <Text
                                style={{
                                    color: TEXT_MUTED,
                                    fontSize: 13,
                                    textDecorationLine: "line-through",
                                }}
                            >
                                {Number(product.comparePrice).toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}{" "}
                                birr
                            </Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );
}

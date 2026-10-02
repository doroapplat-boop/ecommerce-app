import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    Image,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/constants";
import api from "@/constants/api";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import type { Address, HeaderProps } from "@/constants/types";

const MENU_ITEMS = [
    { title: "Home", icon: "home-outline", route: "/(tabs)" },
    { title: "Shop", icon: "storefront-outline", route: "/shop" },
    { title: "Cart", icon: "cart-outline", route: "/(tabs)/cart" },
    { title: "My Orders", icon: "receipt-outline", route: "/(tabs)/orders" },
    { title: "Favorites", icon: "heart-outline", route: "/(tabs)/favorites" },
    { title: "Addresses", icon: "location-outline", route: "/addresses" },
    { title: "Profile", icon: "person-outline", route: "/(tabs)/profile" },
    { title: "Settings", icon: "settings-outline", route: "/settings" },
] as const;

export default function Header({
    title,
    showBack,
    showSearch,
    showCart,
    showWishlist,
    showMenu,
    showLogo,
    branded,
    searchValue,
    onSearchChange,
    onSearchSubmit,
    searchPlaceholder = "Search Products",
}: HeaderProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { wishlist } = useWishlist();
    const { itemCount } = useCart();
    const { isSignedIn, getToken } = useAuth();
    const showHeart = showWishlist || showCart;
    const [menuOpen, setMenuOpen] = useState(false);
    const [savedCity, setSavedCity] = useState("");
    const cartBadge = itemCount > 0 ? (itemCount > 99 ? "99+" : String(itemCount)) : null;

    const loadSavedCity = useCallback(async () => {
        if (!branded || !isSignedIn) {
            setSavedCity("");
            return;
        }
        try {
            const token = await getToken();
            const { data } = await api.get("/addresses", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const list: Address[] = data?.data || [];
            if (!list.length) {
                setSavedCity("");
                return;
            }
            const preferred = list.find((a) => a.isDefault) || list[0];
            setSavedCity(preferred?.city?.trim() || "");
        } catch {
            setSavedCity("");
        }
    }, [branded, isSignedIn, getToken]);

    useFocusEffect(
        useCallback(() => {
            loadSavedCity();
        }, [loadSavedCity])
    );

    const goTo = (route: string) => {
        setMenuOpen(false);
        router.push(route as any);
    };

    const menuModal = (
        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
            <View className="flex-1 flex-row">
                <View
                    className="bg-white h-full"
                    style={{
                        width: "78%",
                        maxWidth: 320,
                        paddingTop: insets.top + 12,
                        paddingBottom: insets.bottom + 12,
                    }}
                >
                    <View className="px-5 pb-4 border-b border-gray-100 flex-row items-center justify-between">
                        <View className="flex-1 mr-3">
                            <Image
                                source={require("@/assets/logo.png")}
                                style={{ width: "100%", height: 34 }}
                                resizeMode="contain"
                            />
                        </View>
                        <TouchableOpacity
                            onPress={() => setMenuOpen(false)}
                            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                        >
                            <Ionicons name="close" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-3 pt-3">
                        {MENU_ITEMS.map((item) => (
                            <TouchableOpacity
                                key={item.title}
                                onPress={() => goTo(item.route)}
                                className="flex-row items-center px-3 py-3.5 rounded-xl mb-1"
                            >
                                <View className="w-10 h-10 rounded-full bg-surface items-center justify-center mr-3 relative">
                                    <Ionicons name={item.icon as any} size={20} color={COLORS.primary} />
                                    {item.title === "Cart" && !!cartBadge && (
                                        <View
                                            style={{
                                                position: "absolute",
                                                top: -2,
                                                right: -2,
                                                minWidth: 16,
                                                height: 16,
                                                borderRadius: 8,
                                                backgroundColor: "#EF4444",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                paddingHorizontal: 3,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: "#FFFFFF",
                                                    fontSize: 9,
                                                    fontWeight: "700",
                                                    includeFontPadding: false,
                                                }}
                                            >
                                                {cartBadge}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <Text className="text-primary font-medium text-base flex-1">{item.title}</Text>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.secondary} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <TouchableWithoutFeedback onPress={() => setMenuOpen(false)}>
                    <View className="flex-1 bg-black/40" />
                </TouchableWithoutFeedback>
            </View>
        </Modal>
    );

    if (branded) {
        return (
            <>
                <View
                    style={{
                        backgroundColor: COLORS.primary,
                        paddingTop: insets.top + 8,
                        paddingBottom: 20,
                        paddingHorizontal: 16,
                        borderBottomLeftRadius: 28,
                        borderBottomRightRadius: 28,
                    }}
                >
                    <View className="flex-row items-start justify-between mb-4">
                        <View className="flex-1 mr-3">
                            <View className="flex-row items-center mb-1">
                                {showMenu && (
                                    <TouchableOpacity
                                        onPress={() => setMenuOpen(true)}
                                        className="mr-2"
                                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                    >
                                        <Ionicons name="menu-outline" size={26} color="#FFFFFF" />
                                    </TouchableOpacity>
                                )}
                                <Text className="text-white font-bold text-lg">
                                    {title || "Location"}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => router.push("/addresses")}
                                className="flex-row items-center ml-8"
                                activeOpacity={0.8}
                            >
                                <Ionicons name="location-outline" size={14} color="#FFFFFF" />
                                <Text className="text-white text-xs ml-1 opacity-90" numberOfLines={1}>
                                    {savedCity || "Manage shipping address"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row items-center gap-2">
                            {showHeart && (
                                <View style={{ width: 46, height: 46, justifyContent: "center", alignItems: "center" }}>
                                    <TouchableOpacity
                                        onPress={() => router.push("/(tabs)/favorites")}
                                        style={{
                                            width: 42,
                                            height: 42,
                                            borderRadius: 21,
                                            backgroundColor: "rgba(255,255,255,0.18)",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Ionicons name="heart-outline" size={22} color="#FFFFFF" />
                                    </TouchableOpacity>
                                    {wishlist.length > 0 && (
                                        <View
                                            pointerEvents="none"
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                right: 0,
                                                minWidth: 18,
                                                height: 18,
                                                borderRadius: 9,
                                                backgroundColor: "#EF4444",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                paddingHorizontal: 3,
                                                zIndex: 10,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: "#FFFFFF",
                                                    fontSize: 10,
                                                    fontWeight: "700",
                                                    includeFontPadding: false,
                                                    textAlignVertical: "center",
                                                    textAlign: "center",
                                                }}
                                            >
                                                {wishlist.length > 99 ? "99+" : wishlist.length}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>

                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: "#FFFFFF",
                            borderRadius: 999,
                            paddingHorizontal: 16,
                            paddingVertical: 4,
                            minHeight: 48,
                        }}
                    >
                        <Ionicons name="search-outline" size={20} color={COLORS.secondary} />
                        <TextInput
                            style={{
                                flex: 1,
                                paddingHorizontal: 10,
                                paddingVertical: 10,
                                fontSize: 15,
                                color: "#111827",
                            }}
                            placeholder={searchPlaceholder}
                            placeholderTextColor={COLORS.secondary}
                            value={searchValue}
                            onChangeText={onSearchChange}
                            onSubmitEditing={onSearchSubmit}
                            returnKeyType="search"
                        />
                    </View>
                </View>
                {menuModal}
            </>
        );
    }

    return (
        <View className="flex-row items-center justify-between px-4 py-3 bg-white">
            <View className="flex-row items-center flex-1">
                {showBack && (
                    <TouchableOpacity
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace("/(tabs)");
                            }
                        }}
                        className="mr-3 p-1"
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                )}

                {showMenu && (
                    <TouchableOpacity
                        onPress={() => setMenuOpen(true)}
                        className="mr-3 p-1"
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Ionicons name="menu-outline" size={28} color={COLORS.primary} />
                    </TouchableOpacity>
                )}

                {showLogo ? (
                    <View className="flex-1">
                        <Image
                            source={require("@/assets/logo.png")}
                            style={{ width: "100%", height: 36 }}
                            resizeMode="contain"
                        />
                    </View>
                ) : title ? (
                    <Text className="text-xl font-bold text-primary text-center flex-1 mr-8">{title}</Text>
                ) : null}

                {!title && !showSearch && !showLogo && <View className="flex-1" />}
            </View>

            <View className="flex-row items-center gap-4">
                {showSearch && (
                    <TouchableOpacity onPress={() => router.push("/shop")}>
                        <Ionicons name="search-outline" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                )}
                {showHeart && (
                    <TouchableOpacity
                        onPress={() => router.push("/(tabs)/favorites")}
                        style={{ overflow: "visible" }}
                    >
                        <View className="relative" style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
                            <Ionicons name="heart-outline" size={24} color={COLORS.primary} />
                            {wishlist.length > 0 && (
                                <View
                                    style={{
                                        position: "absolute",
                                        top: -4,
                                        right: -6,
                                        minWidth: 18,
                                        height: 18,
                                        borderRadius: 9,
                                        backgroundColor: "#EF4444",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        paddingHorizontal: 4,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: "#FFFFFF",
                                            fontSize: 10,
                                            fontWeight: "700",
                                            lineHeight: 12,
                                            textAlign: "center",
                                        }}
                                    >
                                        {wishlist.length > 99 ? "99+" : wishlist.length}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            {menuModal}
        </View>
    );
}

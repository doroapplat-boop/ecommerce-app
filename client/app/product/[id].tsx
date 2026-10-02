import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
    Dimensions,
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Modal,
    StatusBar,
    NativeScrollEvent,
    NativeSyntheticEvent,
} from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/constants";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import type { Product } from "@/constants/types";
import api from "@/constants/api";
import ProductCard from "@/components/ProductCard";

const { width, height } = Dimensions.get("window");
const IMAGE_HEIGHT = Math.min(width * 0.82, 320);
const DESC_PREVIEW = 140;

export default function ProductDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [product, setProduct] = useState<Product | null>(null);
    const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [showFullDesc, setShowFullDesc] = useState(false);
    const [cartBusy, setCartBusy] = useState<"add" | "buy" | null>(null);

    const { addToCart, removeFromCart, cartItems } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();

    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [fullscreen, setFullscreen] = useState(false);
    const [fullscreenIndex, setFullscreenIndex] = useState(0);
    const carouselRef = useRef<ScrollView>(null);
    const fullscreenRef = useRef<ScrollView>(null);

    useEffect(() => {
        setLoading(true);
        setActiveImageIndex(0);
        setQuantity(1);
        setShowFullDesc(false);
        fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        try {
            const { data } = await api.get(`/products/${id}`);
            const current = data.data;
            setProduct(current);
            await fetchSimilar(current);
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Failed to Fetch Product",
                text2: error.response?.data?.message || "Something went wrong",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchSimilar = async (current: Product) => {
        try {
            const categoryName = typeof current.category === "object" ? current.category?.name : current.category;
            const { data } = await api.get("/products", {
                params: categoryName ? { category: categoryName, limit: 8 } : { limit: 8 },
            });
            if (data.success) {
                const items = (data.data || []).filter((item: Product) => item._id !== current._id).slice(0, 6);
                setSimilarProducts(items);
            }
        } catch (error) {
            console.error("Failed to fetch similar products:", error);
            setSimilarProducts([]);
        }
    };

    const onCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slide = Math.round(e.nativeEvent.contentOffset.x / width);
        if (slide >= 0 && slide !== activeImageIndex) setActiveImageIndex(slide);
    };

    const onFullscreenScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slide = Math.round(e.nativeEvent.contentOffset.x / width);
        if (slide >= 0) {
            setFullscreenIndex(slide);
            setActiveImageIndex(slide);
        }
    };

    const openFullscreen = () => {
        setFullscreenIndex(activeImageIndex);
        setFullscreen(true);
        setTimeout(() => {
            fullscreenRef.current?.scrollTo({ x: activeImageIndex * width, animated: false });
        }, 50);
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    if (!product) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center bg-white">
                <Text className="text-black">Product not found</Text>
            </SafeAreaView>
        );
    }

    const isLiked = isInWishlist(product._id);
    const images = product.images?.length ? product.images : [];
    const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const isInCart = cartItems.some((item) => item.productId === product._id || item.id === product._id);
    const description = product.description || "";
    const needsReadMore = description.length > DESC_PREVIEW;
    const shownDescription =
        showFullDesc || !needsReadMore ? description : `${description.slice(0, DESC_PREVIEW).trim()}...`;

    const handleAddToCart = async () => {
        if (cartBusy) return;
        setCartBusy("add");
        try {
            if (isInCart) {
                await removeFromCart(product._id);
                Toast.show({ type: "success", text1: "Removed from cart" });
                return;
            }
            const ok = await addToCart(product, quantity);
            if (ok) {
                Toast.show({ type: "success", text1: "Added to cart", text2: `${quantity} item(s)` });
            }
        } finally {
            setCartBusy(null);
        }
    };

    const handleBuyNow = async () => {
        if (cartBusy) return;
        setCartBusy("buy");
        try {
            const added = await addToCart(product, quantity);
            if (added) router.push("/checkout");
        } finally {
            setCartBusy(null);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
            {/* Header above image */}
            <View className="px-4 py-3 flex-row justify-between items-center bg-white">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-14 h-14 bg-gray-100 rounded-full items-center justify-center"
                >
                    <Ionicons name="arrow-back" size={28} color="#111" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => router.push("/(tabs)/cart")}
                    className="w-14 h-14 bg-gray-100 rounded-full items-center justify-center relative"
                >
                    <Ionicons name="cart-outline" size={28} color="#111" />
                    {cartCount > 0 && (
                        <View className="absolute top-2 right-2 w-3.5 h-3.5 bg-red-500 rounded-full" />
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingBottom: 150 + Math.max(insets.bottom, 20) }}
                showsVerticalScrollIndicator={false}
            >
                <View className="relative bg-gray-100" style={{ height: IMAGE_HEIGHT }}>
                    <ScrollView
                        ref={carouselRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={onCarouselScroll}
                        scrollEventThrottle={16}
                    >
                        {images.map((img, index) => (
                            <TouchableOpacity key={index} activeOpacity={0.95} onPress={openFullscreen}>
                                <Image source={{ uri: img }} style={{ width, height: IMAGE_HEIGHT }} resizeMode="cover" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {images.length > 0 && (
                        <View className="absolute bottom-3 left-0 right-0 flex-row items-center justify-center z-10 px-3">
                            <View className="bg-black/45 px-3 py-1 rounded-full">
                                <Text className="text-white text-xs font-medium">
                                    {activeImageIndex + 1} / {images.length}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={openFullscreen}
                                activeOpacity={0.85}
                                className="absolute right-3 w-11 h-11 rounded-full bg-white items-center justify-center"
                                style={{
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.15,
                                    shadowRadius: 3,
                                    elevation: 3,
                                }}
                            >
                                <Ionicons name="expand-outline" size={22} color="#111" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {images.length > 1 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="px-4 mt-3"
                        contentContainerStyle={{ gap: 8 }}
                    >
                        {images.map((img, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => {
                                    setActiveImageIndex(index);
                                    carouselRef.current?.scrollTo({ x: index * width, animated: true });
                                }}
                                className={`rounded-lg overflow-hidden border-2 ${
                                    index === activeImageIndex ? "border-primary" : "border-transparent"
                                }`}
                            >
                                <Image source={{ uri: img }} style={{ width: 56, height: 56 }} resizeMode="cover" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                <View className="px-5 pt-5">
                    <View className="flex-row items-start justify-between mb-3">
                        <View className="flex-1 pr-3">
                            <Text className="text-2xl font-bold mb-2" style={{ color: "#111" }}>
                                {product.name}
                            </Text>
                            <View className="flex-row items-center flex-wrap mt-1">
                                <Text className="text-xl font-bold mr-2" style={{ color: "#111" }}>
                                    {Number(product.price).toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}{" "}
                                    birr
                                </Text>
                                {!!product.comparePrice && Number(product.comparePrice) > Number(product.price) && (
                                    <Text className="text-base line-through" style={{ color: "#9CA3AF" }}>
                                        {Number(product.comparePrice).toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}{" "}
                                        birr
                                    </Text>
                                )}
                            </View>
                        </View>

                        <View className="flex-row items-center mt-1">
                            <TouchableOpacity
                                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                                className="w-11 h-11 rounded-full border border-gray-300 items-center justify-center bg-white"
                            >
                                <Ionicons name="remove" size={22} color="#111" />
                            </TouchableOpacity>
                            <Text
                                className="mx-4 text-lg font-bold"
                                style={{ color: "#111", minWidth: 20, textAlign: "center" }}
                            >
                                {quantity}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setQuantity((q) => q + 1)}
                                className="w-11 h-11 rounded-full items-center justify-center"
                                style={{ backgroundColor: COLORS.primary }}
                            >
                                <Ionicons name="add" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{ marginTop: 28, maxWidth: width * 0.72 }}>
                        <Text className="text-base font-bold mb-2" style={{ color: "#111" }}>
                            Description
                        </Text>
                        <Text
                            className="text-[15px] mb-1"
                            style={{ color: "#4B5563", lineHeight: 22 }}
                        >
                            {shownDescription}
                        </Text>
                        {needsReadMore && (
                            <TouchableOpacity onPress={() => setShowFullDesc((v) => !v)} className="mt-1">
                                <Text className="font-bold text-[15px]" style={{ color: COLORS.primary }}>
                                    {showFullDesc ? "Show Less" : "Read More"}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {similarProducts.length > 0 && (
                        <View className="mt-5 mb-6 pt-4 border-t border-gray-100">
                            <Text className="text-lg font-bold mb-3" style={{ color: "#111" }}>
                                Similar Products
                            </Text>
                            <View className="flex-row flex-wrap justify-between">
                                {similarProducts.map((item) => (
                                    <ProductCard key={item._id} product={item} />
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            <Modal visible={fullscreen} transparent animationType="fade" onRequestClose={() => setFullscreen(false)}>
                <StatusBar hidden />
                <View style={{ flex: 1, backgroundColor: "#000" }}>
                    <TouchableOpacity
                        onPress={() => setFullscreen(false)}
                        className="absolute top-12 right-4 z-20 w-10 h-10 bg-white/20 rounded-full items-center justify-center"
                    >
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>

                    <View className="absolute top-14 left-0 right-0 z-10 items-center">
                        <Text className="text-white font-medium">
                            {fullscreenIndex + 1} / {images.length}
                        </Text>
                    </View>

                    <ScrollView
                        ref={fullscreenRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={onFullscreenScroll}
                        style={{ flex: 1 }}
                        contentContainerStyle={{ alignItems: "center" }}
                    >
                        {images.map((img, index) => (
                            <ScrollView
                                key={index}
                                maximumZoomScale={3}
                                minimumZoomScale={1}
                                showsHorizontalScrollIndicator={false}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{
                                    width,
                                    height,
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                                centerContent
                            >
                                <Image source={{ uri: img }} style={{ width, height: height * 0.8 }} resizeMode="contain" />
                            </ScrollView>
                        ))}
                    </ScrollView>
                </View>
            </Modal>

            {/* Footer */}
            <View
                className="absolute bottom-0 left-0 right-0 px-4 bg-white border-t border-gray-100"
                style={{ paddingTop: 14, paddingBottom: Math.max(insets.bottom, 12) + 18 }}
            >
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                        onPress={() => toggleWishlist(product)}
                        className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center"
                    >
                        <Ionicons
                            name={isLiked ? "heart" : "heart-outline"}
                            size={26}
                            color={isLiked ? COLORS.accent : "#111"}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleAddToCart}
                        disabled={!!cartBusy}
                        className="flex-1 h-14 rounded-2xl items-center border-2 flex-row justify-center bg-white"
                        style={{
                            borderColor: isInCart ? "#EF4444" : COLORS.primary,
                            opacity: cartBusy && cartBusy !== "add" ? 0.6 : 1,
                        }}
                    >
                        {cartBusy === "add" ? (
                            <ActivityIndicator color={isInCart ? "#EF4444" : COLORS.primary} />
                        ) : (
                            <Text
                                className="font-bold text-base"
                                style={{ color: isInCart ? "#EF4444" : COLORS.primary }}
                            >
                                {isInCart ? "Remove from cart" : "Add to cart"}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleBuyNow}
                        disabled={!!cartBusy}
                        className="flex-1 h-14 rounded-2xl items-center flex-row justify-center"
                        style={{
                            backgroundColor: COLORS.primary,
                            opacity: cartBusy && cartBusy !== "buy" ? 0.6 : 1,
                        }}
                    >
                        {cartBusy === "buy" ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text className="text-white font-bold text-base">Buy Now</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

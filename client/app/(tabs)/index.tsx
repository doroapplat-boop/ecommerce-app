import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CategoryItem from "@/components/CategoryItem";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import api from "@/constants/api";
import { COLORS } from "@/constants";
import type { Category, Product } from "@/constants/types";

const { width } = Dimensions.get("window");
const BANNER_GAP = 12;
const BANNER_WIDTH = width - 48; // peeks next banner
const BANNER_HEIGHT = Math.round(BANNER_WIDTH * 0.48);
const BANNER_STEP = BANNER_WIDTH + BANNER_GAP;

type Banner = {
    _id: string;
    title: string;
    subtitle?: string;
    buttonText?: string;
    image: string;
    link?: string;
};

export default function Home() {
    const router = useRouter();
    const bannerRef = useRef<ScrollView>(null);
    const [activeBannerIndex, setActiveBannerIndex] = useState(0);
    const [products, setProducts] = useState<Product[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [categories, setCategories] = useState<{ id: string; name: string; icon?: string; image?: string }[]>([
        { id: "all", name: "All", icon: "apps" },
    ]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [loadError, setLoadError] = useState("");

    const goToSearch = () => {
        router.push({
            pathname: "/shop",
            params: { search: search.trim() },
        });
    };

    const loadHomeData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setLoadError("");
        try {
            const [productsRes, categoriesRes, bannersRes] = await Promise.allSettled([
                api.get("/products", { params: { limit: 50 } }),
                api.get("/categories"),
                api.get("/banners"),
            ]);

            if (productsRes.status === "fulfilled") {
                setProducts(productsRes.value.data?.data || []);
            } else {
                setProducts([]);
                setLoadError("Could not load products. Check server connection.");
            }

            if (categoriesRes.status === "fulfilled" && categoriesRes.value.data?.success) {
                setCategories([
                    { id: "all", name: "All", icon: "apps" },
                    ...categoriesRes.value.data.data.map((cat: Category) => ({
                        id: cat._id,
                        name: cat.name,
                        icon: cat.icon,
                        image: cat.image,
                    })),
                ]);
            }

            if (bannersRes.status === "fulfilled" && bannersRes.value.data?.success) {
                setBanners(bannersRes.value.data.data || []);
            }
        } catch (error) {
            console.error("Error loading home:", error);
            setLoadError("Could not load home data.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadHomeData();
    }, []);

    useEffect(() => {
        if (banners.length <= 1) return;

        const timer = setInterval(() => {
            setActiveBannerIndex((prev) => {
                const next = (prev + 1) % banners.length;
                bannerRef.current?.scrollTo({ x: next * BANNER_STEP, animated: true });
                return next;
            });
        }, 4000);

        return () => clearInterval(timer);
    }, [banners.length]);

    const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slide = Math.round(e.nativeEvent.contentOffset.x / BANNER_STEP);
        if (slide !== activeBannerIndex && slide >= 0 && slide < banners.length) {
            setActiveBannerIndex(slide);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={[]}>
            <Header
                title="Location"
                showMenu
                showWishlist
                branded
                searchValue={search}
                onSearchChange={setSearch}
                onSearchSubmit={goToSearch}
                searchPlaceholder="Search Products"
            />

            <ScrollView
                className="flex-1 px-4"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadHomeData(true)}
                        colors={[COLORS.primary]}
                        tintColor={COLORS.primary}
                    />
                }
            >
                {banners.length > 0 && (
                    <View className="mb-5 mt-4" style={{ marginHorizontal: -16 }}>
                        <ScrollView
                            ref={bannerRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={onBannerScroll}
                            scrollEventThrottle={16}
                            decelerationRate="fast"
                            snapToInterval={BANNER_STEP}
                            snapToAlignment="start"
                            contentContainerStyle={{ paddingHorizontal: 16 }}
                        >
                            {banners.map((banner, index) => (
                                <TouchableOpacity
                                    key={banner._id}
                                    activeOpacity={0.9}
                                    onPress={() =>
                                        router.push({
                                            pathname: "/banner/[id]",
                                            params: {
                                                id: banner._id,
                                                title: banner.title || "",
                                                subtitle: banner.subtitle || "",
                                                image: banner.image || "",
                                            },
                                        })
                                    }
                                    className="bg-gray-200 overflow-hidden"
                                    style={{
                                        width: BANNER_WIDTH,
                                        height: BANNER_HEIGHT,
                                        borderRadius: 18,
                                        marginRight: index === banners.length - 1 ? 0 : BANNER_GAP,
                                    }}
                                >
                                    <Image source={{ uri: banner.image }} className="w-full h-full" resizeMode="cover" />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View className="flex-row justify-center mt-3 gap-2 px-4">
                            {banners.map((banner, index) => (
                                <View
                                    key={banner._id}
                                    className={`h-2 rounded-full ${index === activeBannerIndex ? "w-6 bg-primary" : "w-2 bg-gray-300"}`}
                                />
                            ))}
                        </View>
                    </View>
                )}

                <View className="mb-5 mt-4">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-xl font-bold" style={{ color: "#111" }}>
                            Categories
                        </Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {categories.map((cat) => (
                            <CategoryItem
                                key={cat.id}
                                item={cat}
                                isSelected={false}
                                onPress={() => router.push({ pathname: "/shop", params: { category: cat.id === "all" ? "" : cat.name } })}
                            />
                        ))}
                    </ScrollView>
                </View>

                <View className="mb-8">
                    <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-xl font-bold" style={{ color: "#000000" }}>
                            Popular
                        </Text>
                        <TouchableOpacity onPress={() => router.push("/shop")}>
                            <Text className="text-sm" style={{ color: "#6B7280" }}>
                                See All
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {loading ? (
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    ) : loadError || products.length === 0 ? (
                        <View className="items-center py-8">
                            <Text className="text-secondary text-center mb-4">
                                {loadError || "No products found"}
                            </Text>
                            <TouchableOpacity onPress={() => loadHomeData(true)} className="bg-primary px-6 py-3 rounded-full">
                                <Text className="text-white font-bold">Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View className="flex-row flex-wrap justify-between mb-20">
                            {products.map((product) => (
                                <ProductCard key={product._id} product={product} />
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

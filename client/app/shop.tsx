import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { COLORS } from "@/constants";
import api from "@/constants/api";
import type { Category, Product } from "@/constants/types";

type ShopCategory = {
    id: string;
    name: string;
    image?: string;
    icon?: string;
};

export default function Shop() {
    const params = useLocalSearchParams<{ category?: string; search?: string }>();
    const paramCategory = useMemo(() => {
        const value = Array.isArray(params.category) ? params.category[0] : params.category;
        return (value || "").trim();
    }, [params.category]);
    const paramSearch = useMemo(() => {
        const value = Array.isArray(params.search) ? params.search[0] : params.search;
        return (value || "").trim();
    }, [params.search]);

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<ShopCategory[]>([{ id: "all", name: "All" }]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState(paramSearch);
    const [sort, setSort] = useState("-createdAt");
    const [category, setCategory] = useState(paramCategory);
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [showFilters, setShowFilters] = useState(false);

    const fetchCategories = async () => {
        try {
            const { data } = await api.get("/categories");
            if (data.success) {
                setCategories([
                    { id: "all", name: "All", icon: "apps-outline" },
                    ...data.data.map((cat: Category) => ({
                        id: cat._id,
                        name: cat.name,
                        image: cat.image,
                        icon: cat.icon,
                    })),
                ]);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    const fetchProducts = async (pageNumber = 1, activeCategory = category, activeSearch = search) => {
        if (pageNumber === 1) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const queryParams: any = { sort, page: pageNumber, limit: 10 };
            if (activeCategory && activeCategory !== "All") queryParams.category = activeCategory;
            if (minPrice) queryParams.minPrice = minPrice;
            if (maxPrice) queryParams.maxPrice = maxPrice;
            if (activeSearch) queryParams.search = activeSearch;

            const { data } = await api.get("/products", { params: queryParams });

            if (pageNumber === 1) {
                setProducts(data.data);
            } else {
                setProducts((prev) => [...prev, ...data.data]);
            }

            setHasMore(data.pagination.page < data.pagination.pages);
            setPage(pageNumber);
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleSearch = () => {
        fetchProducts(1);
    };

    const loadMore = () => {
        if (!loadingMore && !loading && hasMore) {
            fetchProducts(page + 1);
        }
    };

    const clearFilters = () => {
        setCategory("");
        setMinPrice("");
        setMaxPrice("");
        setSort("-createdAt");
        setSearch("");
    };

    const selectCategory = (name: string) => {
        const next = name === "All" ? "" : name;
        setCategory(next);
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        setCategory(paramCategory);
    }, [paramCategory]);

    useEffect(() => {
        setSearch(paramSearch);
    }, [paramSearch]);

    useEffect(() => {
        fetchProducts(1, category, search);
    }, [sort, category, minPrice, maxPrice, search]);

    return (
        <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
            <Header title={category || "Shop"} showBack showWishlist />

            <View className="flex-row gap-2 mb-2 mx-4 my-2">
                <View className="flex-1 flex-row items-center bg-white rounded-xl border border-gray-100">
                    <Ionicons name="search" className="ml-4" size={20} color={COLORS.secondary} />
                    <TextInput
                        className="flex-1 ml-2 text-primary px-4 py-3"
                        placeholder="Search products..."
                        value={search}
                        onChangeText={setSearch}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                </View>
                <TouchableOpacity
                    className="bg-gray-800 w-12 h-12 items-center justify-center rounded-xl"
                    onPress={() => setShowFilters(true)}
                >
                    <Ionicons name="options-outline" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="px-4"
                style={{ flexGrow: 0, height: 92 }}
                contentContainerStyle={{ paddingRight: 24, alignItems: "flex-start" }}
            >
                {categories.map((cat) => {
                    const selected = cat.name === "All" ? category === "" : category === cat.name;
                    return (
                        <TouchableOpacity
                            key={cat.id}
                            onPress={() => selectCategory(cat.name)}
                            className="mr-3 items-center"
                            style={{ width: 64 }}
                        >
                            <View
                                className={`w-14 h-14 rounded-full overflow-hidden items-center justify-center border-2 ${
                                    selected ? "border-primary" : "border-transparent"
                                } bg-white`}
                            >
                                {cat.image ? (
                                    <Image source={{ uri: cat.image }} className="w-full h-full" resizeMode="cover" />
                                ) : (
                                    <Ionicons
                                        name={(cat.icon || "apps-outline") as any}
                                        size={22}
                                        color={selected ? COLORS.primary : COLORS.secondary}
                                    />
                                )}
                            </View>
                            <Text
                                className={`text-xs mt-1 ${selected ? "text-primary font-bold" : "text-secondary"}`}
                                numberOfLines={1}
                            >
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={(item) => item._id}
                    numColumns={2}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}
                    columnWrapperStyle={{ justifyContent: "space-between" }}
                    renderItem={({ item }) => <ProductCard product={item} />}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingMore ? (
                            <View className="py-4">
                                <ActivityIndicator size="small" color={COLORS.primary} />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        !loading ? (
                            <View className="flex-1 items-center justify-center py-20">
                                <Text className="text-secondary">
                                    {category ? `No products in ${category}` : "No products found"}
                                </Text>
                            </View>
                        ) : null
                    }
                />
            )}

            <Modal
                visible={showFilters}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFilters(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 h-[80%]">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-primary">Filters</Text>
                            <TouchableOpacity onPress={() => setShowFilters(false)}>
                                <Ionicons name="close" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text className="font-bold text-primary mb-3">Sort By</Text>
                            <View className="flex-row flex-wrap gap-2 mb-6">
                                {[
                                    { label: "Newest", value: "-createdAt" },
                                    { label: "Price: Low to High", value: "price" },
                                    { label: "Price: High to Low", value: "-price" },
                                ].map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        onPress={() => setSort(option.value)}
                                        className={`px-4 py-2 rounded-full border ${
                                            sort === option.value
                                                ? "bg-primary border-primary"
                                                : "bg-white border-gray-100"
                                        }`}
                                    >
                                        <Text className={sort === option.value ? "text-white" : "text-primary"}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text className="font-bold text-primary mb-3">Category</Text>
                            <View className="flex-row flex-wrap gap-3 mb-6">
                                {categories.map((cat) => {
                                    const selected =
                                        cat.name === "All" ? category === "" : category === cat.name;
                                    return (
                                        <TouchableOpacity
                                            key={cat.id}
                                            onPress={() => selectCategory(cat.name)}
                                            className={`w-[30%] items-center p-2 rounded-xl border ${
                                                selected ? "border-primary bg-primary/5" : "border-gray-100"
                                            }`}
                                        >
                                            {cat.image ? (
                                                <Image
                                                    source={{ uri: cat.image }}
                                                    className="w-12 h-12 rounded-lg mb-1"
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View className="w-12 h-12 rounded-lg mb-1 bg-surface items-center justify-center">
                                                    <Ionicons
                                                        name={(cat.icon || "apps-outline") as any}
                                                        size={20}
                                                        color={COLORS.primary}
                                                    />
                                                </View>
                                            )}
                                            <Text
                                                className={`text-xs text-center ${
                                                    selected ? "text-primary font-bold" : "text-primary"
                                                }`}
                                                numberOfLines={1}
                                            >
                                                {cat.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text className="font-bold text-primary mb-3">Price Range</Text>
                            <View className="flex-row gap-4 mb-8">
                                <View className="flex-1 bg-surface rounded-xl">
                                    <TextInput
                                        placeholder="Min"
                                        keyboardType="numeric"
                                        value={minPrice}
                                        onChangeText={setMinPrice}
                                        className="px-4 py-3"
                                    />
                                </View>
                                <View className="flex-1 bg-surface rounded-xl">
                                    <TextInput
                                        placeholder="Max"
                                        keyboardType="numeric"
                                        value={maxPrice}
                                        onChangeText={setMaxPrice}
                                        className="px-4 py-3"
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        <View className="flex-row gap-4 pt-4 border-t border-gray-100">
                            <TouchableOpacity
                                className="flex-1 py-4 items-center rounded-full border border-gray-300"
                                onPress={clearFilters}
                            >
                                <Text className="font-bold text-primary">Reset</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-primary py-4 items-center rounded-full"
                                onPress={() => {
                                    fetchProducts(1);
                                    setShowFilters(false);
                                }}
                            >
                                <Text className="font-bold text-white">Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

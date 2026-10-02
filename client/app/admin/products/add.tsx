import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View, Switch, Image, ActivityIndicator, Modal, FlatList, TouchableWithoutFeedback, Platform, } from "react-native";
import Toast from 'react-native-toast-message';
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { COLORS } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import type { Category } from "@/constants/types";

export default function AddProduct() {
    const router = useRouter();
    const { getToken } = useAuth();

    const [submitting, setSubmitting] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [comparePrice, setComparePrice] = useState("");
    const [stock, setStock] = useState("");
    const [category, setCategory] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [isFeatured, setIsFeatured] = useState(false);

    const selectedCategory = categories.find((c) => c.name === category);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const { data } = await api.get("/categories");
                if (data.success) {
                    setCategories(data.data);
                    if (data.data[0]) setCategory(data.data[0].name);
                }
            } catch (error) {
                console.error(error);
            }
        };
        loadCategories();
    }, []);

    // PICK MULTIPLE IMAGES (MAX 5)
    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: 12,
            quality: 0.8,
        });

        if (!result.canceled) {
            const uris = result.assets.map((asset) => asset.uri);
            setImages(uris.slice(0, 12));
        }
    };

    // Add Product
    const handleSubmit = async () => {
        if (!name || !price || !category) {
            Toast.show({
                type: "error",
                text1: "Missing Fields",
                text2: "Please fill in all required fields",
            });
            return;
        }

        if (images.length === 0) {
            Toast.show({
                type: "error",
                text1: "Add Image",
                text2: "Please upload at least one product image",
            });
            return;
        }

        try {
            setSubmitting(true);

            const token = await getToken();
            if (!token) {
                Toast.show({ type: "error", text1: "Please sign in again" });
                return;
            }

            const formData = new FormData();

            const fields = {
                name: name.trim(),
                description: description.trim() || "No description",
                price,
                comparePrice: comparePrice || "",
                stock: stock || "0",
                category,
                isFeatured: String(isFeatured),
            };

            Object.entries(fields).forEach(([key, value]) => formData.append(key, value));

            for (const [i, uri] of images.entries()) {
                const lower = uri.toLowerCase();
                const isPng = lower.includes(".png");
                const filename = isPng ? `image-${i}.png` : `image-${i}.jpg`;
                const mimeType = isPng ? "image/png" : "image/jpeg";

                if (Platform.OS === "web") {
                    const blob = await (await fetch(uri)).blob();
                    formData.append("images", new File([blob], filename, { type: mimeType }));
                } else {
                    formData.append("images", { uri, name: filename, type: mimeType } as any);
                }
            }

            const { data } = await api.post("/products", formData, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 120000,
            });

            if (!data?.success) throw new Error(data?.message || "Upload failed");

            Toast.show({
                type: "success",
                text1: "Success",
                text2: "Product created",
            });
            router.replace("/admin/products");
        } catch (error: any) {
            const status = error.response?.status;
            const serverMsg = error.response?.data?.message;
            const isTimeout = error.code === "ECONNABORTED" || String(error.message || "").includes("timeout");
            console.error("Create product failed:", status, serverMsg || error.message);
            Toast.show({
                type: "error",
                text1: "Failed to Create Product",
                text2: isTimeout
                    ? "Upload timed out. Try fewer or smaller images"
                    : serverMsg || error.message || (status ? `Error ${status}` : "Something went wrong"),
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView className="flex-1 bg-surface p-4">
            <View className="bg-white p-4 rounded-xl shadow-sm mb-20">
                {/* NAME */}
                <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                    Product Name *
                </Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-4 text-primary"
                    placeholder="e.g. Wireless Headphones"
                    value={name}
                    onChangeText={setName}
                />

                {/* PRICE */}
                <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                    Price (birr) *
                </Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-4 text-primary"
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                />

                <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                    Old / Discount Price (birr)
                </Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-1 text-primary"
                    placeholder="Optional — shown with line through"
                    keyboardType="decimal-pad"
                    value={comparePrice}
                    onChangeText={setComparePrice}
                />
                <Text className="text-secondary text-xs mb-4">
                    Example: Price 124000, Old price 130000 → old price is crossed out
                </Text>

                {/* CATEGORY */}
                <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                    Category
                </Text>
                <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    className="bg-surface p-3 rounded-lg mb-4 flex-row justify-between items-center"
                >
                    <View className="flex-row items-center flex-1">
                        {selectedCategory?.image ? (
                            <Image source={{ uri: selectedCategory.image }} className="w-10 h-10 rounded-lg mr-3" resizeMode="cover" />
                        ) : (
                            <View className="w-10 h-10 rounded-lg mr-3 bg-gray-200 items-center justify-center">
                                <Ionicons name={(selectedCategory?.icon || "apps-outline") as any} size={18} color={COLORS.primary} />
                            </View>
                        )}
                        <Text className="text-primary font-medium">{category || "Select Category"}</Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={COLORS.secondary} />
                </TouchableOpacity>

                {/* CATEGORY MODAL */}
                <Modal visible={modalVisible} animationType="slide" transparent>
                    <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                        <View className="flex-1 justify-end bg-black/50">
                            <TouchableWithoutFeedback>
                                <View className="bg-white rounded-t-2xl p-4 max-h-[70%]">
                                    <Text className="text-lg font-bold text-center mb-4">
                                        Select Category
                                    </Text>

                                    <FlatList
                                        data={categories}
                                        keyExtractor={(item) => item._id}
                                        numColumns={3}
                                        columnWrapperStyle={{ justifyContent: "space-between" }}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                className={`w-[31%] mb-3 rounded-xl border p-2 items-center ${
                                                    category === item.name ? "border-primary bg-primary/5" : "border-gray-100"
                                                }`}
                                                onPress={() => {
                                                    setCategory(item.name);
                                                    setModalVisible(false);
                                                }}
                                            >
                                                {item.image ? (
                                                    <Image source={{ uri: item.image }} className="w-16 h-16 rounded-xl mb-2" resizeMode="cover" />
                                                ) : (
                                                    <View className="w-16 h-16 rounded-xl mb-2 bg-surface items-center justify-center">
                                                        <Ionicons name={(item.icon || "apps-outline") as any} size={24} color={COLORS.primary} />
                                                    </View>
                                                )}
                                                <Text
                                                    className={`text-xs text-center ${
                                                        category === item.name ? "font-bold text-primary" : "text-primary"
                                                    }`}
                                                    numberOfLines={2}
                                                >
                                                    {item.name}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    />
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

                {/* STOCK */}
                <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                    Stock Level
                </Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-4 text-primary"
                    placeholder="0"
                    keyboardType="number-pad"
                    value={stock}
                    onChangeText={setStock}
                />

                {/* IMAGE PICKER */}
                <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                    Product Images (max 12)
                </Text>

                <TouchableOpacity onPress={pickImages} className="mb-4">
                    {images.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {images.map((uri, i) => (
                                <Image
                                    key={i}
                                    source={{ uri }}
                                    className="w-32 h-32 rounded-lg mr-2"
                                />
                            ))}
                        </ScrollView>
                    ) : (
                        <View className="w-full h-32 rounded-lg bg-gray-100 justify-center items-center border border-dashed border-gray-300">
                            <Ionicons
                                name="cloud-upload-outline"
                                size={32}
                                color={COLORS.secondary}
                            />
                            <Text className="text-secondary text-xs mt-2">
                                Tap to upload images
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* DESCRIPTION */}
                <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                    Description
                </Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-6 text-primary h-24"
                    multiline
                    value={description}
                    onChangeText={setDescription}
                />

                {/* FEATURED */}
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-primary font-bold">Featured Product</Text>
                    <Switch
                        value={isFeatured}
                        onValueChange={setIsFeatured}
                        trackColor={{ false: "#eee", true: COLORS.primary }}
                    />
                </View>

                {/* SUBMIT */}
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={submitting}
                    className={`bg-primary p-4 rounded-xl items-center ${submitting ? "opacity-70" : ""
                        }`}
                >
                    {submitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">
                            Create Product
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

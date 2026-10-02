import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View, Switch, Image, ActivityIndicator, Platform, Modal, FlatList, TouchableWithoutFeedback } from "react-native";
import Toast from 'react-native-toast-message';
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { COLORS } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import type { Category } from "@/constants/types";

export default function EditProduct() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { getToken } = useAuth();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);

    // Form State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [comparePrice, setComparePrice] = useState("");
    const [stock, setStock] = useState("");
    const [category, setCategory] = useState("");
    const [isFeatured, setIsFeatured] = useState(false);

    // Image State
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [newImages, setNewImages] = useState<string[]>([]);

    const selectedCategory = categories.find((c) => c.name === category);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data } = await api.get("/categories");
                if (data.success) setCategories(data.data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const { data } = await api.get(`/products/${id}`);
                if (data.success) {
                    const product = data.data;
                    setName(product.name);
                    setDescription(product.description || "");
                    setPrice(product.price.toString());
                    setComparePrice(product.comparePrice ? String(product.comparePrice) : "");
                    setStock(product.stock.toString());
                    setCategory(typeof product.category === 'object' ? product.category.name : product.category);
                    setIsFeatured(product.isFeatured);

                    if (product.images && Array.isArray(product.images)) {
                        setExistingImages(product.images);
                    } else if (product.images) {
                        setExistingImages([product.images]);
                    }
                }
            } catch (error: any) {
                console.error("Failed to fetch product:", error);
                Toast.show({
                    type: 'error',
                    text1: 'Failed to Fetch Product',
                    text2: error.response?.data?.message || "Something went wrong"
                });
                router.back();
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchProduct();
    }, [id]);

    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: 12 - (existingImages.length + newImages.length),
            quality: 0.8,
        });

        if (!result.canceled) {
            const uris = result.assets.map((asset) => asset.uri);
            setNewImages([...newImages, ...uris]);
        }
    };

    const removeExistingImage = (index: number) => {
        const updated = [...existingImages];
        updated.splice(index, 1);
        setExistingImages(updated);
    };

    const removeNewImage = (index: number) => {
        const updated = [...newImages];
        updated.splice(index, 1);
        setNewImages(updated);
    };

    const handleSubmit = async () => {
        if (!name || !price) {
            Toast.show({
                type: 'error',
                text1: 'Missing Fields',
                text2: 'Please fill in all required fields'
            });
            return;
        }

        try {
            setSubmitting(true);
            const token = await getToken();
            const formData = new FormData();

            formData.append("name", name);
            formData.append("description", description);
            formData.append("price", price);
            formData.append("comparePrice", comparePrice || "");
            formData.append("stock", stock);
            formData.append("category", category);
            formData.append("isFeatured", String(isFeatured));

            // Append existing images
            existingImages.forEach((img) => {
                formData.append("existingImages", img);
            });

            // Append new images
            for (const [i, uri] of newImages.entries()) {
                const filename = `new-image-${i}.jpg`;
                if (Platform.OS === "web") {
                    const blob = await (await fetch(uri)).blob();
                    formData.append("images", new File([blob], filename, { type: "image/jpeg" }));
                } else {
                    formData.append("images", { uri, name: filename, type: "image/jpeg" } as any);
                }
            }

            const { data } = await api.put(`/products/${id}`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                timeout: 120000,
            });

            if (data.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Product updated successfully'
                });
                router.back();
            }
        } catch (error: any) {
            const status = error.response?.status;
            const serverMsg = error.response?.data?.message;
            const isTimeout = error.code === "ECONNABORTED" || String(error.message || "").includes("timeout");
            console.error("Failed to update product:", status, serverMsg || error.message);
            Toast.show({
                type: 'error',
                text1: 'Failed to Update Product',
                text2: isTimeout
                    ? "Upload timed out. Try fewer or smaller images"
                    : serverMsg || error.message || "Something went wrong"
            });
        } finally {
            setSubmitting(false);
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
        <ScrollView className="flex-1 bg-surface p-4">
            <View className="bg-white p-4 rounded-xl border border-gray-100 mb-20">
                <Text className="text-secondary text-xs font-bold mb-1 uppercase">Product Name *</Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-4 text-primary"
                    value={name}
                    onChangeText={setName}
                />

                <Text className="text-secondary text-xs font-bold mb-1 uppercase">Price (birr) *</Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-4 text-primary"
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                />

                <Text className="text-secondary text-xs font-bold mb-1 uppercase">Old / Discount Price (birr)</Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-1 text-primary"
                    placeholder="Optional — shown with line through"
                    keyboardType="decimal-pad"
                    value={comparePrice}
                    onChangeText={setComparePrice}
                />
                <Text className="text-secondary text-xs mb-4">
                    Leave empty to hide. Higher than Price shows as crossed-out old price
                </Text>

                <Text className="text-secondary text-xs font-bold mb-1 uppercase">Stock Level</Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-4 text-primary"
                    keyboardType="number-pad"
                    value={stock}
                    onChangeText={setStock}
                />

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

                <Modal visible={modalVisible} animationType="slide" transparent>
                    <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                        <View className="flex-1 justify-end bg-black/50">
                            <TouchableWithoutFeedback>
                                <View className="bg-white rounded-t-2xl p-4 max-h-[70%]">
                                    <Text className="text-lg font-bold text-center mb-4">Select Category</Text>
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

                <Text className="text-secondary text-xs font-bold mb-1 uppercase">Images</Text>
                <View className="mb-4">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {existingImages.map((uri, index) => (
                            <View key={`existing-${index}`} className="relative mr-2">
                                <Image source={{ uri }} className="w-24 h-24 rounded-lg" />
                                <TouchableOpacity
                                    onPress={() => removeExistingImage(index)}
                                    className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
                                >
                                    <Ionicons name="close" size={12} color="white" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {newImages.map((uri, index) => (
                            <View key={`new-${index}`} className="relative mr-2">
                                <Image source={{ uri }} className="w-24 h-24 rounded-lg border-2 border-primary" />
                                <TouchableOpacity
                                    onPress={() => removeNewImage(index)}
                                    className="absolute top-1 right-1 bg-primary rounded-full p-1"
                                >
                                    <Ionicons name="close" size={12} color="white" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {(existingImages.length + newImages.length) < 12 && (
                            <TouchableOpacity
                                onPress={pickImages}
                                className="w-24 h-24 rounded-lg bg-gray-100 justify-center items-center border border-dashed border-gray-300"
                            >
                                <Ionicons name="add" size={24} color={COLORS.secondary} />
                                <Text className="text-xs text-secondary mt-1">Add</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>

                <Text className="text-secondary text-xs font-bold mb-1 uppercase">Description</Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-6 text-primary h-24"
                    multiline
                    textAlignVertical="top"
                    value={description}
                    onChangeText={setDescription}
                />

                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-primary font-bold">Featured Product</Text>
                    <Switch
                        value={isFeatured}
                        onValueChange={setIsFeatured}
                        trackColor={{ false: "#eee", true: COLORS.primary }}
                    />
                </View>

                <TouchableOpacity
                    className={`bg-primary p-4 rounded-xl items-center ${submitting ? 'opacity-70' : ''}`}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-medium text-lg">Update Product</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

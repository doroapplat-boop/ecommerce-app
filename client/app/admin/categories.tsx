import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { COLORS } from "@/constants";
import type { Category } from "@/constants/types";

const ICON_OPTIONS = [
    "shirt-outline",
    "sparkles-outline",
    "balloon-outline",
    "walk-outline",
    "bag-handle-outline",
    "apps-outline",
    "footsteps-outline",
    "watch-outline",
    "glasses-outline",
    "diamond-outline",
    "home-outline",
    "car-outline",
    "phone-portrait-outline",
    "laptop-outline",
    "game-controller-outline",
    "fitness-outline",
    "cafe-outline",
    "gift-outline",
    "heart-outline",
];

export default function AdminCategories() {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);

    const [name, setName] = useState("");
    const [icon, setIcon] = useState("apps-outline");
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(true);

    const fetchCategories = async () => {
        try {
            const token = await getToken();
            const { data } = await api.get("/categories/all", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) setCategories(data.data);
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Failed to load categories",
                text2: error.response?.data?.message || "Something went wrong",
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const openCreate = () => {
        setEditing(null);
        setName("");
        setIcon("apps-outline");
        setImageUri(null);
        setIsActive(true);
        setModalVisible(true);
    };

    const openEdit = (cat: Category) => {
        setEditing(cat);
        setName(cat.name);
        setIcon(cat.icon || "apps-outline");
        setImageUri(cat.image || null);
        setIsActive(cat.isActive);
        setModalVisible(true);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });
        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Toast.show({ type: "error", text1: "Name required", text2: "Enter a category name" });
            return;
        }

        try {
            setSubmitting(true);
            const token = await getToken();
            if (!token) {
                Toast.show({ type: "error", text1: "Please sign in again" });
                return;
            }

            const isRemoteImage = !!imageUri && (imageUri.startsWith("http://") || imageUri.startsWith("https://"));
            const hasNewLocalImage = !!imageUri && !isRemoteImage;
            const authHeader = { Authorization: `Bearer ${token}` };

            // Edit without new image → JSON (more reliable)
            if (editing && !hasNewLocalImage) {
                const { data } = await api.put(
                    `/categories/${editing._id}`,
                    {
                        name: name.trim(),
                        icon,
                        isActive,
                        image: isRemoteImage ? imageUri : editing.image || "",
                    },
                    { headers: authHeader, timeout: 30000 }
                );
                if (!data?.success) throw new Error(data?.message || "Update failed");
                Toast.show({ type: "success", text1: "Category updated" });
                setModalVisible(false);
                fetchCategories();
                return;
            }

            // Create without image → JSON
            if (!editing && !hasNewLocalImage) {
                const { data } = await api.post(
                    "/categories",
                    {
                        name: name.trim(),
                        icon,
                        isActive,
                    },
                    { headers: authHeader, timeout: 30000 }
                );
                if (!data?.success) throw new Error(data?.message || "Create failed");
                Toast.show({ type: "success", text1: "Category created" });
                setModalVisible(false);
                fetchCategories();
                return;
            }

            const formData = new FormData();
            formData.append("name", name.trim());
            formData.append("icon", icon);
            formData.append("isActive", String(isActive));

            if (hasNewLocalImage && imageUri) {
                const lower = imageUri.toLowerCase();
                const isPng = lower.includes(".png");
                const filename = isPng ? "category.png" : "category.jpg";
                const mimeType = isPng ? "image/png" : "image/jpeg";

                if (Platform.OS === "web") {
                    const blob = await (await fetch(imageUri)).blob();
                    formData.append("image", new File([blob], filename, { type: mimeType }));
                } else {
                    formData.append("image", {
                        uri: imageUri,
                        name: filename,
                        type: mimeType,
                    } as any);
                }
            }

            const config = { headers: authHeader, timeout: 90000 };

            if (editing) {
                const { data } = await api.put(`/categories/${editing._id}`, formData, config);
                if (!data?.success) throw new Error(data?.message || "Update failed");
                Toast.show({ type: "success", text1: "Category updated" });
            } else {
                const { data } = await api.post("/categories", formData, config);
                if (!data?.success) throw new Error(data?.message || "Create failed");
                Toast.show({ type: "success", text1: "Category created" });
            }

            setModalVisible(false);
            fetchCategories();
        } catch (error: any) {
            const status = error.response?.status;
            const serverMsg = error.response?.data?.message;
            const isTimeout = error.code === "ECONNABORTED" || String(error.message || "").includes("timeout");
            Toast.show({
                type: "error",
                text1: "Save failed",
                text2: isTimeout
                    ? "Upload timed out. Try a smaller image"
                    : serverMsg || error.message || (status ? `Error ${status}` : "Something went wrong"),
            });
            console.error("Save category failed:", status, serverMsg || error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const performDelete = async (id: string) => {
        try {
            const token = await getToken();
            await api.delete(`/categories/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            Toast.show({ type: "success", text1: "Category deleted" });
            fetchCategories();
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Delete failed",
                text2: error.response?.data?.message || "Something went wrong",
            });
        }
    };

    const deleteCategory = (id: string) => {
        if (Platform.OS === "web") {
            if (window.confirm("Delete this category?")) performDelete(id);
        } else {
            Alert.alert("Delete Category", "Are you sure?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => performDelete(id) },
            ]);
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
        <View className="flex-1 bg-surface">
            <ScrollView
                className="flex-1 p-4"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            fetchCategories();
                        }}
                    />
                }
            >
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-lg font-bold text-primary">Categories ({categories.length})</Text>
                    <TouchableOpacity onPress={openCreate} className="bg-primary px-4 py-2 rounded-full flex-row items-center">
                        <Ionicons name="add" size={18} color="#fff" />
                        <Text className="text-white font-bold ml-1">Add</Text>
                    </TouchableOpacity>
                </View>

                {categories.map((cat) => (
                    <View key={cat._id} className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 flex-row items-center">
                        <View className="w-14 h-14 rounded-full bg-surface overflow-hidden items-center justify-center mr-3">
                            {cat.image ? (
                                <Image source={{ uri: cat.image }} className="w-full h-full" />
                            ) : (
                                <Ionicons name={(cat.icon || "apps-outline") as any} size={24} color={COLORS.primary} />
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className="text-primary font-bold text-base">{cat.name}</Text>
                            <Text className="text-secondary text-xs mt-1">
                                {cat.isActive ? "Active" : "Hidden"} · {cat.icon || "no icon"}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => openEdit(cat)} className="p-2 mr-1">
                            <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteCategory(cat._id)} className="p-2">
                            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-5 max-h-[90%]">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-primary">{editing ? "Edit Category" : "Add Category"}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text className="text-primary font-medium mb-2">Name</Text>
                            <TextInput
                                className="bg-surface p-4 rounded-xl text-primary mb-4"
                                placeholder="e.g. Electronics"
                                value={name}
                                onChangeText={setName}
                            />

                            <Text className="text-primary font-medium mb-2">Category Image</Text>
                            <TouchableOpacity onPress={pickImage} className="mb-4">
                                {imageUri ? (
                                    <Image source={{ uri: imageUri }} className="w-24 h-24 rounded-full" />
                                ) : (
                                    <View className="w-24 h-24 rounded-full bg-surface items-center justify-center border border-dashed border-gray-300">
                                        <Ionicons name="camera-outline" size={28} color={COLORS.secondary} />
                                        <Text className="text-secondary text-[10px] mt-1">Upload</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <Text className="text-primary font-medium mb-2">Fallback Icon</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                                {ICON_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt}
                                        onPress={() => setIcon(opt)}
                                        className={`w-12 h-12 rounded-full items-center justify-center mr-2 ${icon === opt ? "bg-primary" : "bg-surface"}`}
                                    >
                                        <Ionicons name={opt as any} size={22} color={icon === opt ? "#fff" : COLORS.primary} />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <View className="flex-row justify-between items-center mb-6">
                                <Text className="text-primary font-bold">Active</Text>
                                <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: "#eee", true: COLORS.primary }} />
                            </View>

                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={submitting}
                                className={`bg-primary py-4 rounded-full items-center mb-4 ${submitting ? "opacity-70" : ""}`}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white font-bold text-lg">{editing ? "Update" : "Create"}</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

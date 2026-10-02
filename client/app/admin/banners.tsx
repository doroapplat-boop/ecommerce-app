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

type Banner = {
    _id: string;
    title: string;
    subtitle?: string;
    buttonText?: string;
    image: string;
    link?: string;
    isActive: boolean;
    sortOrder: number;
};

export default function AdminBanners() {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<Banner | null>(null);

    const [title, setTitle] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [buttonText, setButtonText] = useState("Get Now");
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(true);

    const fetchBanners = async () => {
        try {
            const token = await getToken();
            const { data } = await api.get("/banners/all", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) setBanners(data.data);
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Failed to load banners",
                text2: error.response?.data?.message || "Something went wrong",
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const openCreate = () => {
        setEditing(null);
        setTitle("");
        setSubtitle("");
        setButtonText("Get Now");
        setImageUri(null);
        setIsActive(true);
        setModalVisible(true);
    };

    const openEdit = (banner: Banner) => {
        setEditing(banner);
        setTitle(banner.title);
        setSubtitle(banner.subtitle || "");
        setButtonText(banner.buttonText || "Get Now");
        setImageUri(banner.image);
        setIsActive(banner.isActive);
        setModalVisible(true);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
        });
        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Toast.show({ type: "error", text1: "Title required" });
            return;
        }
        if (!imageUri) {
            Toast.show({ type: "error", text1: "Image required", text2: "Please upload a banner image" });
            return;
        }

        try {
            setSubmitting(true);
            const token = await getToken();
            const formData = new FormData();
            formData.append("title", title.trim());
            formData.append("subtitle", subtitle.trim());
            formData.append("buttonText", buttonText.trim() || "Get Now");
            formData.append("isActive", String(isActive));

            if (imageUri && !imageUri.startsWith("http")) {
                const filename = "banner.jpg";
                if (Platform.OS === "web") {
                    const blob = await (await fetch(imageUri)).blob();
                    formData.append("image", new File([blob], filename, { type: "image/jpeg" }));
                } else {
                    formData.append("image", { uri: imageUri, name: filename, type: "image/jpeg" } as any);
                }
            }

            if (editing) {
                await api.put(`/banners/${editing._id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                Toast.show({ type: "success", text1: "Banner updated" });
            } else {
                await api.post("/banners", formData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                Toast.show({ type: "success", text1: "Banner created" });
            }

            setModalVisible(false);
            fetchBanners();
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Save failed",
                text2: error.response?.data?.message || "Something went wrong",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const performDelete = async (id: string) => {
        try {
            const token = await getToken();
            await api.delete(`/banners/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            Toast.show({ type: "success", text1: "Banner deleted" });
            fetchBanners();
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Delete failed",
                text2: error.response?.data?.message || "Something went wrong",
            });
        }
    };

    const deleteBanner = (id: string) => {
        if (Platform.OS === "web") {
            if (window.confirm("Delete this banner?")) performDelete(id);
        } else {
            Alert.alert("Delete Banner", "Are you sure?", [
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
                            fetchBanners();
                        }}
                    />
                }
            >
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-lg font-bold text-primary">Banners ({banners.length})</Text>
                    <TouchableOpacity onPress={openCreate} className="bg-primary px-4 py-2 rounded-full flex-row items-center">
                        <Ionicons name="add" size={18} color="#fff" />
                        <Text className="text-white font-bold ml-1">Add</Text>
                    </TouchableOpacity>
                </View>

                {banners.map((banner) => (
                    <View key={banner._id} className="bg-white rounded-2xl border border-gray-100 mb-3 overflow-hidden">
                        <Image source={{ uri: banner.image }} className="w-full h-36" resizeMode="cover" />
                        <View className="p-4 flex-row items-center">
                            <View className="flex-1">
                                <Text className="text-primary font-bold text-base">{banner.title}</Text>
                                <Text className="text-secondary text-xs mt-1">{banner.subtitle}</Text>
                                <Text className="text-secondary text-xs mt-1">
                                    Button: {banner.buttonText || "Get Now"} · {banner.isActive ? "Active" : "Hidden"}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => openEdit(banner)} className="p-2 mr-1">
                                <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteBanner(banner._id)} className="p-2">
                                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-5 max-h-[92%]">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-primary">{editing ? "Edit Banner" : "Add Banner"}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text className="text-primary font-medium mb-2">Banner Image</Text>
                            <TouchableOpacity onPress={pickImage} className="mb-4">
                                {imageUri ? (
                                    <Image source={{ uri: imageUri }} className="w-full h-40 rounded-xl" resizeMode="cover" />
                                ) : (
                                    <View className="w-full h-40 rounded-xl bg-surface items-center justify-center border border-dashed border-gray-300">
                                        <Ionicons name="image-outline" size={36} color={COLORS.secondary} />
                                        <Text className="text-secondary text-xs mt-2">Tap to upload / change image</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <Text className="text-primary font-medium mb-2">Title</Text>
                            <TextInput
                                className="bg-surface p-4 rounded-xl text-primary mb-4"
                                placeholder="e.g. 50% Off"
                                value={title}
                                onChangeText={setTitle}
                            />

                            <Text className="text-primary font-medium mb-2">Subtitle</Text>
                            <TextInput
                                className="bg-surface p-4 rounded-xl text-primary mb-4"
                                placeholder="e.g. On everything today"
                                value={subtitle}
                                onChangeText={setSubtitle}
                            />

                            <Text className="text-primary font-medium mb-2">Button Text</Text>
                            <TextInput
                                className="bg-surface p-4 rounded-xl text-primary mb-4"
                                placeholder="Get Now"
                                value={buttonText}
                                onChangeText={setButtonText}
                            />

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
                                    <Text className="text-white font-bold text-lg">{editing ? "Update Banner" : "Create Banner"}</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

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

type PaymentMethod = {
    _id: string;
    name: string;
    accountName?: string;
    image: string;
    accountNumber: string;
    isActive: boolean;
    sortOrder: number;
};

export default function AdminPayments() {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<PaymentMethod | null>(null);

    const [name, setName] = useState("");
    const [accountName, setAccountName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(true);

    const fetchMethods = async () => {
        try {
            const token = await getToken();
            const { data } = await api.get("/payment-methods/all", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) setMethods(data.data);
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Failed to load payments",
                text2: error.response?.data?.message || "Something went wrong",
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMethods();
    }, []);

    const openCreate = () => {
        setEditing(null);
        setName("");
        setAccountName("");
        setAccountNumber("");
        setImageUri(null);
        setIsActive(true);
        setModalVisible(true);
    };

    const openEdit = (method: PaymentMethod) => {
        setEditing(method);
        setName(method.name || "");
        setAccountName((method.accountName || "").trim());
        setAccountNumber(method.accountNumber || "");
        setImageUri(method.image || null);
        setIsActive(method.isActive !== false);
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
        if (!name.trim()) {
            Toast.show({ type: "error", text1: "Bank / method name required" });
            return;
        }
        if (!accountName.trim()) {
            Toast.show({ type: "error", text1: "Account name required" });
            return;
        }
        if (!accountNumber.trim()) {
            Toast.show({ type: "error", text1: "Account number required" });
            return;
        }
        if (!imageUri) {
            Toast.show({ type: "error", text1: "Logo required", text2: "Please upload a payment logo" });
            return;
        }

        try {
            setSubmitting(true);
            const token = await getToken();
            if (!token) {
                Toast.show({ type: "error", text1: "Please sign in again" });
                return;
            }

            const isRemoteImage = imageUri.startsWith("http://") || imageUri.startsWith("https://");
            const hasNewLocalImage = !isRemoteImage;
            const authHeader = { Authorization: `Bearer ${token}` };

            // Text-only update (no new logo file) → JSON so accountName always saves
            if (editing && !hasNewLocalImage) {
                const { data } = await api.put(
                    `/payment-methods/${editing._id}`,
                    {
                        name: name.trim(),
                        accountName: accountName.trim(),
                        accountNumber: accountNumber.trim(),
                        isActive,
                        image: isRemoteImage ? imageUri : undefined,
                    },
                    { headers: authHeader, timeout: 30000 }
                );
                if (!data?.success) {
                    throw new Error(data?.message || "Update failed");
                }
                Toast.show({ type: "success", text1: "Payment method updated" });
                setModalVisible(false);
                fetchMethods();
                return;
            }

            const formData = new FormData();
            formData.append("name", name.trim());
            formData.append("accountName", accountName.trim());
            formData.append("accountNumber", accountNumber.trim());
            formData.append("isActive", String(isActive));

            if (hasNewLocalImage) {
                const lower = imageUri.toLowerCase();
                const isPng = lower.includes(".png");
                const filename = isPng ? "payment-logo.png" : "payment-logo.jpg";
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
            } else if (isRemoteImage) {
                formData.append("image", imageUri);
            }

            const config = {
                headers: authHeader,
                timeout: 90000,
            };

            if (editing) {
                const { data } = await api.put(`/payment-methods/${editing._id}`, formData, config);
                if (!data?.success) throw new Error(data?.message || "Update failed");
                Toast.show({ type: "success", text1: "Payment method updated" });
            } else {
                const { data } = await api.post("/payment-methods", formData, config);
                if (!data?.success) throw new Error(data?.message || "Create failed");
                Toast.show({ type: "success", text1: "Payment method created" });
            }

            setModalVisible(false);
            fetchMethods();
        } catch (error: any) {
            const status = error.response?.status;
            const serverMsg = error.response?.data?.message;
            const isTimeout = error.code === "ECONNABORTED" || String(error.message || "").includes("timeout");
            Toast.show({
                type: "error",
                text1: "Save failed",
                text2: isTimeout
                    ? "Upload timed out. Try a smaller logo image"
                    : serverMsg || error.message || (status ? `Error ${status}` : "Something went wrong"),
            });
            console.error("Save payment method failed:", status, serverMsg || error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const performDelete = async (id: string) => {
        try {
            const token = await getToken();
            await api.delete(`/payment-methods/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            Toast.show({ type: "success", text1: "Payment method deleted" });
            fetchMethods();
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Delete failed",
                text2: error.response?.data?.message || "Something went wrong",
            });
        }
    };

    const deleteMethod = (id: string) => {
        if (Platform.OS === "web") {
            if (window.confirm("Delete this payment method?")) performDelete(id);
        } else {
            Alert.alert("Delete Payment", "Are you sure?", [
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
                            fetchMethods();
                        }}
                    />
                }
            >
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-lg font-bold text-primary">Payments ({methods.length})</Text>
                    <TouchableOpacity onPress={openCreate} className="bg-primary px-4 py-2 rounded-full flex-row items-center">
                        <Ionicons name="add" size={18} color="#fff" />
                        <Text className="text-white font-bold ml-1">Add</Text>
                    </TouchableOpacity>
                </View>

                {methods.map((method) => (
                    <View key={method._id} className="bg-white rounded-2xl border border-gray-100 mb-3 p-4 flex-row items-center">
                        <Image source={{ uri: method.image }} className="w-14 h-14 rounded-lg mr-3" resizeMode="contain" />
                        <View className="flex-1">
                            <Text className="text-primary font-bold text-base">{method.name}</Text>
                            {!!method.accountName && (
                                <Text className="text-secondary text-xs mt-1">{method.accountName}</Text>
                            )}
                            <Text className="text-secondary text-xs mt-1">{method.accountNumber}</Text>
                            <Text className="text-secondary text-xs mt-1">{method.isActive ? "Active" : "Hidden"}</Text>
                        </View>
                        <TouchableOpacity onPress={() => openEdit(method)} className="p-2 mr-1">
                            <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteMethod(method._id)} className="p-2">
                            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-5 max-h-[92%]">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-primary">
                                {editing ? "Edit Payment" : "Add Payment"}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: 40 }}
                        >
                            <Text className="text-primary font-medium mb-2">Logo Image</Text>
                            <TouchableOpacity onPress={pickImage} className="mb-4 items-center">
                                {imageUri ? (
                                    <Image source={{ uri: imageUri }} className="w-28 h-28 rounded-xl" resizeMode="contain" />
                                ) : (
                                    <View className="w-28 h-28 rounded-xl bg-surface items-center justify-center border border-dashed border-gray-300">
                                        <Ionicons name="image-outline" size={28} color={COLORS.secondary} />
                                        <Text className="text-secondary text-xs mt-1">Upload</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <Text className="text-primary font-medium mb-2">Bank / Method Name</Text>
                            <TextInput
                                className="bg-surface p-4 rounded-xl text-primary mb-4 border border-gray-100"
                                placeholder="e.g. Telebirr / CBE"
                                value={name}
                                onChangeText={setName}
                            />

                            <Text className="text-primary font-medium mb-2">Account Name (holder)</Text>
                            <TextInput
                                className="bg-surface p-4 rounded-xl text-primary mb-4 border border-gray-100"
                                placeholder="e.g. Abubeker Osman Ahmed"
                                value={accountName}
                                onChangeText={setAccountName}
                            />

                            <Text className="text-primary font-medium mb-2">Account Number</Text>
                            <TextInput
                                className="bg-surface p-4 rounded-xl text-primary mb-4 border border-gray-100"
                                placeholder="Number customers will copy"
                                value={accountNumber}
                                onChangeText={setAccountNumber}
                                keyboardType="default"
                            />

                            <View className="flex-row justify-between items-center mb-6">
                                <Text className="text-primary font-bold">Active</Text>
                                <Switch
                                    value={isActive}
                                    onValueChange={setIsActive}
                                    trackColor={{ false: "#eee", true: COLORS.primary }}
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={submitting}
                                className={`bg-primary py-4 rounded-full items-center mb-4 ${submitting ? "opacity-70" : ""}`}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white font-bold text-lg">
                                        {editing ? "Update Payment" : "Create Payment"}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

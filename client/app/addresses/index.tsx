import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
    Platform,
    Keyboard,
    type KeyboardEvent,
} from "react-native";
import Toast from 'react-native-toast-message';
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import { COLORS } from "@/constants";
import api from "@/constants/api";
import { getApiToken } from "@/constants/authToken";
import type { Address } from "@/constants/types";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

const COUNTRY_CODE = "+251";

function formatPhoneForSave(local: string) {
    const digits = local.replace(/\D/g, "");
    if (digits.startsWith("251")) return `+${digits}`;
    if (digits.startsWith("0")) return `${COUNTRY_CODE}${digits.slice(1)}`;
    return `${COUNTRY_CODE}${digits}`;
}

function localPhoneFromStored(phone?: string) {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("251")) return digits.slice(3);
    return digits;
}

export default function Addresses() {
    const router = useRouter();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    const { getToken, isSignedIn, isLoaded } = useAuth();

    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [phone, setPhone] = useState("");
    const [isDefault, setIsDefault] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [keyboardPad, setKeyboardPad] = useState(0);
    const formScrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (!isLoaded) return;
        if (!isSignedIn) {
            router.replace("/sign-in");
            return;
        }
        fetchAddresses();
    }, [isLoaded, isSignedIn]);

    useEffect(() => {
        if (!modalVisible) {
            setKeyboardPad(0);
            return;
        }
        const onShow = (e: KeyboardEvent) => {
            // Modals do not resize with the keyboard on Android — pad both platforms
            const h = e.endCoordinates?.height ?? 0;
            setKeyboardPad(h);
            setTimeout(() => formScrollRef.current?.scrollToEnd({ animated: true }), 80);
        };
        const onHide = () => setKeyboardPad(0);
        const showSub = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
            onShow
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
            onHide
        );
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [modalVisible]);

    const scrollPhoneIntoView = () => {
        setTimeout(() => formScrollRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const fetchAddresses = async () => {
        try {
            const token = await getApiToken(getToken);
            if (!token) {
                Toast.show({
                    type: "error",
                    text1: "Sign in required",
                    text2: "Please sign in again",
                });
                router.replace("/sign-in");
                return;
            }
            const { data } = await api.get("/addresses", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setAddresses(data.data);
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Failed to Fetch Addresses',
                text2:
                    error?.userMessage ||
                    error.response?.data?.message ||
                    "Something went wrong",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEditSearch = (item: Address) => {
        setIsEditing(true);
        setEditingId(item._id);
        setCity(item.city);
        setState(item.state);
        setPhone(localPhoneFromStored(item.phone));
        setIsDefault(item.isDefault);
        setModalVisible(true);
    };

    const handleSaveAddress = async () => {
        if (!city.trim() || !state.trim() || !phone.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Missing Fields',
                text2: 'Please enter city, state, and phone number'
            });
            return;
        }

        setSubmitting(true);
        try {
            const token = await getToken();
            const data = {
                type: "Home",
                street: "",
                city: city.trim(),
                state: state.trim(),
                phone: formatPhoneForSave(phone),
                zipCode: "",
                country: "",
                isDefault,
            };

            if (isEditing && editingId) {
                await api.put(`/addresses/${editingId}`, data, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            } else {
                await api.post("/addresses", data, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }

            setModalVisible(false);
            resetForm();
            fetchAddresses();
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Failed to Save Address',
                text2: error.response?.data?.message || "Something went wrong"
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAddress = async (id: string) => {
        Alert.alert("Delete Address", "Are you sure you want to delete this address?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        const token = await getToken();
                        await api.delete(`/addresses/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                        fetchAddresses();
                    } catch (error: any) {
                        Toast.show({
                            type: 'error',
                            text1: 'Failed to Delete Address',
                            text2: error.response?.data?.message || "Something went wrong"
                        });
                    }
                },
            },
        ]);
    };

    const resetForm = () => {
        setCity("");
        setState("");
        setPhone("");
        setIsDefault(false);
        setIsEditing(false);
        setEditingId(null);
    };

    const openAddModal = () => {
        resetForm();
        setModalVisible(true);
    };

    return (
        <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
            <Header title="Shipping Addresses" showBack />

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView className="flex-1 px-4 pt-4">
                    {addresses.length === 0 ? (
                        <Text className="text-center text-secondary mt-10">No addresses found</Text>
                    ) : (
                        addresses.map((item) => (
                            <View key={item._id} className="bg-white p-4 rounded-xl mb-4 shadow-sm">
                                <View className="flex-row items-center justify-between mb-2">
                                    <View className="flex-1">
                                        <View className="flex-row items-center mb-1">
                                            <Ionicons name="location-outline" size={20} color={COLORS.primary} />
                                            <Text className="text-base font-bold text-primary ml-2">
                                                {item.city}, {item.state}
                                            </Text>
                                            {item.isDefault && (
                                                <View className="bg-primary/10 px-2 py-1 rounded ml-2">
                                                    <Text className="text-primary text-xs font-bold">Default</Text>
                                                </View>
                                            )}
                                        </View>
                                        {!!item.phone && (
                                            <Text className="text-secondary text-sm ml-7">{item.phone}</Text>
                                        )}
                                    </View>
                                    <View className="flex-row items-center gap-4">
                                        <TouchableOpacity onPress={() => handleEditSearch(item)}>
                                            <Ionicons name="pencil-outline" size={20} color={COLORS.secondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteAddress(item._id)}>
                                            <Ionicons name="trash-outline" size={20} color={COLORS.error || '#ff4444'} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}

                    <TouchableOpacity className="flex-row items-center justify-center p-4 border border-dashed border-gray-300 rounded-xl mt-2 mb-8" onPress={openAddModal}>
                        <Ionicons name="add" size={24} color={COLORS.secondary} />
                        <Text className="text-secondary font-medium ml-2">Add New Address</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View className="flex-1 justify-end bg-black/50">
                    <View
                        className="bg-white rounded-t-3xl p-6"
                        style={{
                            maxHeight: keyboardPad > 0 ? "92%" : "88%",
                            marginBottom: keyboardPad,
                        }}
                    >
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-primary">{isEditing ? "Edit Address" : "Add New Address"}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            ref={formScrollRef}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                            contentContainerStyle={{ paddingBottom: Math.max(40, keyboardPad > 0 ? 24 : 32) }}
                        >
                            <Text className="text-primary font-medium mb-2">City</Text>
                            <TextInput
                                className="bg-surface p-4 rounded-xl text-black mb-4"
                                placeholder="City"
                                placeholderTextColor="#999"
                                value={city}
                                onChangeText={setCity}
                                onFocus={scrollPhoneIntoView}
                            />

                            <Text className="text-primary font-medium mb-2">State</Text>
                            <TextInput
                                className="bg-surface p-4 rounded-xl text-black mb-4"
                                placeholder="State"
                                placeholderTextColor="#999"
                                value={state}
                                onChangeText={setState}
                                onFocus={scrollPhoneIntoView}
                            />

                            <Text className="text-primary font-medium mb-2">Phone Number</Text>
                            <View className="flex-row items-center bg-surface rounded-xl overflow-hidden mb-4">
                                <Text className="px-4 text-primary font-medium">{COUNTRY_CODE}</Text>
                                <TextInput
                                    className="flex-1 p-4 text-black"
                                    placeholder="9XXXXXXXX"
                                    placeholderTextColor="#999"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={setPhone}
                                    onFocus={scrollPhoneIntoView}
                                />
                            </View>

                            <TouchableOpacity className="flex-row items-center mb-8" onPress={() => setIsDefault(!isDefault)}>
                                <View className={`w-5 h-5 border rounded mr-2 items-center justify-center ${isDefault ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                                    {isDefault && <Ionicons name="checkmark" size={14} color="white" />}
                                </View>
                                <Text className="text-primary">Set as default address</Text>
                            </TouchableOpacity>

                            <TouchableOpacity className="w-full bg-primary py-4 rounded-full items-center mb-4" onPress={handleSaveAddress} disabled={submitting} >
                                {submitting ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-lg">Save Address</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator, Modal, Platform, TouchableWithoutFeedback, Image, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import { COLORS, formatPrice } from "@/constants";
import api from "@/constants/api";
import { Address } from "@/constants/types";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@clerk/clerk-expo";
import Toast from "react-native-toast-message";

export default function Checkout() {
    const router = useRouter();
    const { cartTotal, cartItems } = useCart();
    const [pageLoading, setPageLoading] = useState(true);

    const { getToken } = useAuth();

    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [phone, setPhone] = useState("");
    const [savingAddress, setSavingAddress] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState(2);
    const [showPaymentTypeModal, setShowPaymentTypeModal] = useState(false);

    const total = cartTotal + deliveryFee;

    const COUNTRY_CODE = "+251";

    const formatPhoneForSave = (local: string) => {
        const digits = local.replace(/\D/g, "");
        if (digits.startsWith("251")) return `+${digits}`;
        if (digits.startsWith("0")) return `${COUNTRY_CODE}${digits.slice(1)}`;
        return `${COUNTRY_CODE}${digits}`;
    };

    const fetchData = async () => {
        try {
            const token = await getToken();
            const [addrRes, feeRes] = await Promise.allSettled([
                api.get("/addresses", { headers: { Authorization: `Bearer ${token}` } }),
                api.get("/settings/delivery"),
            ]);

            if (addrRes.status === "fulfilled") {
                const addrList = addrRes.value.data.data || [];
                setAddresses(addrList);
                if (addrList.length > 0) {
                    const def = addrList.find((a: Address) => a.isDefault) || addrList[0];
                    setSelectedAddress(def);
                } else {
                    setSelectedAddress(null);
                }
            }

            if (feeRes.status === "fulfilled" && feeRes.value.data?.success) {
                setDeliveryFee(Number(feeRes.value.data.data.deliveryFee) || 0);
            }
        } catch (error) {
            console.error("Error fetching checkout data:", error);
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to load checkout information",
            });
        } finally {
            setPageLoading(false);
        }
    };

    const openAddAddress = () => {
        setCity("");
        setState("");
        setPhone("");
        setShowAddressModal(true);
    };

    const handleSaveAddress = async () => {
        if (!city.trim() || !state.trim() || !phone.trim()) {
            Toast.show({
                type: "error",
                text1: "Missing Fields",
                text2: "Please enter city, state, and phone number",
            });
            return;
        }

        setSavingAddress(true);
        try {
            const token = await getToken();
            const { data } = await api.post(
                "/addresses",
                {
                    type: "Home",
                    street: "",
                    city: city.trim(),
                    state: state.trim(),
                    phone: formatPhoneForSave(phone),
                    zipCode: "",
                    country: "",
                    isDefault: addresses.length === 0,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (data.success) {
                setSelectedAddress(data.data);
                setAddresses((prev) => [data.data, ...prev]);
                setShowAddressModal(false);
                Toast.show({
                    type: "success",
                    text1: "Address Added",
                });
            }
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Failed to Save Address",
                text2: error.response?.data?.message || "Something went wrong",
            });
        } finally {
            setSavingAddress(false);
        }
    };

    const handleContinueToPayment = () => {
        if (!selectedAddress) {
            Toast.show({
                type: "error",
                text1: "Add Shipping Address",
                text2: "Please add a shipping address to continue to payment",
            });
            return;
        }
        setShowPaymentTypeModal(true);
    };

    const goToPayment = (paymentType: "full" | "cod") => {
        if (!selectedAddress) return;
        setShowPaymentTypeModal(false);
        router.push({
            pathname: "/payment",
            params: {
                street: selectedAddress.street || "",
                city: selectedAddress.city,
                state: selectedAddress.state,
                phone: selectedAddress.phone || "",
                zipCode: selectedAddress.zipCode || "",
                country: selectedAddress.country || "",
                paymentType,
            },
        });
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (pageLoading) {
        return (
            <SafeAreaView className="flex-1 bg-surface justify-center items-center">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
            <Header title="Checkout" showBack />

            <ScrollView className="flex-1 px-4 mt-4">
                <Text className="text-lg font-bold text-primary mb-4">Your Order</Text>
                {cartItems.length === 0 ? (
                    <View className="bg-white p-6 rounded-xl mb-6 items-center">
                        <Text className="text-secondary">No items in cart</Text>
                    </View>
                ) : (
                    cartItems.map((item) => (
                        <View key={item.id} className="flex-row mb-3 bg-white p-3 rounded-xl">
                            <View className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden mr-3">
                                <Image
                                    source={{ uri: item.product?.images?.[0] }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />
                            </View>
                            <View className="flex-1 justify-center">
                                <Text className="text-primary font-medium text-sm mb-1" numberOfLines={1}>
                                    {item.product?.name}
                                </Text>
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-primary font-bold">{formatPrice(item.price)}</Text>
                                    <Text className="text-secondary text-xs">Qty: {item.quantity}</Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <View className="p-4 bg-white shadow-lg border-t border-gray-100">
                <Text className="text-lg font-bold text-primary mb-4">Order Summary</Text>

                <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-secondary text-sm font-medium">Shipping Address</Text>
                        <TouchableOpacity onPress={openAddAddress}>
                            <Text className="text-accent text-sm">Add</Text>
                        </TouchableOpacity>
                    </View>
                    {selectedAddress ? (
                        <TouchableOpacity onPress={openAddAddress} className="bg-surface p-3 rounded-xl">
                            <Text className="text-primary font-medium text-sm">
                                {selectedAddress.city}, {selectedAddress.state}
                            </Text>
                            {!!selectedAddress.phone && (
                                <Text className="text-secondary text-xs mt-1">{selectedAddress.phone}</Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={openAddAddress}
                            className="bg-surface p-3 rounded-xl items-center border border-dashed border-gray-200"
                        >
                            <Text className="text-primary font-bold text-sm">Add Shipping Address</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View className="flex-row justify-between mb-2">
                    <Text className="text-secondary">Subtotal</Text>
                    <Text className="font-bold">{formatPrice(cartTotal)}</Text>
                </View>
                <View className="flex-row justify-between mb-4">
                    <Text className="text-secondary">Delivery</Text>
                    <Text className="font-bold">{formatPrice(deliveryFee)}</Text>
                </View>
                <View className="flex-row justify-between mb-6">
                    <Text className="text-xl font-bold text-primary">Total</Text>
                    <Text className="text-xl font-bold text-primary">{formatPrice(total)}</Text>
                </View>

                <TouchableOpacity
                    onPress={handleContinueToPayment}
                    disabled={!selectedAddress}
                    className={`p-4 rounded-xl items-center ${!selectedAddress ? "bg-gray-300" : "bg-primary"}`}
                >
                    <Text className={`font-bold text-lg ${!selectedAddress ? "text-gray-500" : "text-white"}`}>
                        Continue to Payment
                    </Text>
                </TouchableOpacity>
            </View>

            <Modal visible={showPaymentTypeModal} animationType="slide" transparent>
                <TouchableWithoutFeedback onPress={() => setShowPaymentTypeModal(false)}>
                    <View className="flex-1 justify-end bg-black/50">
                        <TouchableWithoutFeedback>
                            <View className="bg-white rounded-t-3xl p-5 pb-8">
                                <View className="flex-row justify-between items-center mb-2">
                                    <Text className="text-xl font-bold text-primary">Choose Payment</Text>
                                    <TouchableOpacity onPress={() => setShowPaymentTypeModal(false)}>
                                        <Ionicons name="close" size={24} color={COLORS.secondary} />
                                    </TouchableOpacity>
                                </View>
                                <Text className="text-secondary text-sm mb-5">
                                    How would you like to pay for this order?
                                </Text>

                                <TouchableOpacity
                                    onPress={() => goToPayment("full")}
                                    activeOpacity={0.85}
                                    className="bg-surface p-4 rounded-xl mb-3 border border-gray-100 flex-row items-center"
                                >
                                    <View
                                        className="w-11 h-11 rounded-full items-center justify-center mr-3"
                                        style={{ backgroundColor: "#EFF6FF" }}
                                    >
                                        <Ionicons name="card-outline" size={22} color={COLORS.primary} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-primary font-bold text-base">Pay Full Amount</Text>
                                        <Text className="text-secondary text-xs mt-1">
                                            Pay {formatPrice(total)} now (products + delivery)
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => goToPayment("cod")}
                                    activeOpacity={0.85}
                                    className="bg-surface p-4 rounded-xl border border-gray-100 flex-row items-center"
                                >
                                    <View
                                        className="w-11 h-11 rounded-full items-center justify-center mr-3"
                                        style={{ backgroundColor: "#ECFDF5" }}
                                    >
                                        <Ionicons name="cash-outline" size={22} color="#15803D" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-primary font-bold text-base">Cash on Delivery</Text>
                                        <Text className="text-secondary text-xs mt-1">
                                            Pay delivery {formatPrice(deliveryFee)} now. Pay products{" "}
                                            {formatPrice(cartTotal)} when delivered.
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <Modal visible={showAddressModal} animationType="slide" transparent>
                <TouchableWithoutFeedback onPress={() => setShowAddressModal(false)}>
                    <View className="flex-1 justify-end bg-black/50">
                        <TouchableWithoutFeedback>
                            <View className="bg-white rounded-t-3xl p-5 pb-8 max-h-[85%]">
                                <View className="flex-row justify-between items-center mb-5">
                                    <Text className="text-xl font-bold text-primary">Add New Address</Text>
                                    <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                                        <Ionicons name="close" size={24} color={COLORS.secondary} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false}>
                                    {addresses.length > 0 && (
                                        <View className="mb-5">
                                            <Text className="text-secondary text-sm font-medium mb-3">Saved Addresses</Text>
                                            {addresses.map((item) => (
                                                <TouchableOpacity
                                                    key={item._id}
                                                    onPress={() => {
                                                        setSelectedAddress(item);
                                                        setShowAddressModal(false);
                                                    }}
                                                    className={`p-4 rounded-xl mb-2 flex-row items-center border ${
                                                        selectedAddress?._id === item._id
                                                            ? "border-primary bg-primary/5"
                                                            : "border-gray-100"
                                                    }`}
                                                >
                                                    <Ionicons name="location-outline" size={20} color={COLORS.primary} />
                                                    <View className="ml-3 flex-1">
                                                        <Text className="text-primary font-medium">
                                                            {item.city}, {item.state}
                                                        </Text>
                                                        {!!item.phone && (
                                                            <Text className="text-secondary text-xs mt-1">{item.phone}</Text>
                                                        )}
                                                    </View>
                                                    {selectedAddress?._id === item._id && (
                                                        <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}

                                    <Text className="text-primary font-medium mb-2">City</Text>
                                    <TextInput
                                        className="bg-surface p-4 rounded-xl text-primary mb-4"
                                        placeholder="City"
                                        value={city}
                                        onChangeText={setCity}
                                    />
                                    <Text className="text-primary font-medium mb-2">State</Text>
                                    <TextInput
                                        className="bg-surface p-4 rounded-xl text-primary mb-4"
                                        placeholder="State"
                                        value={state}
                                        onChangeText={setState}
                                    />
                                    <Text className="text-primary font-medium mb-2">Phone Number</Text>
                                    <View className="flex-row items-center bg-surface rounded-xl overflow-hidden mb-6">
                                        <Text className="px-4 text-primary font-medium">{COUNTRY_CODE}</Text>
                                        <TextInput
                                            className="flex-1 p-4 text-primary"
                                            placeholder="9XXXXXXXX"
                                            placeholderTextColor="#999"
                                            keyboardType="phone-pad"
                                            value={phone}
                                            onChangeText={setPhone}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        onPress={handleSaveAddress}
                                        disabled={savingAddress}
                                        className={`w-full py-4 rounded-full items-center mb-2 ${
                                            savingAddress ? "bg-gray-300" : "bg-primary"
                                        }`}
                                    >
                                        {savingAddress ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <Text className="text-white font-bold text-lg">Save Address</Text>
                                        )}
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}

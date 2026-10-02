import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import Header from "@/components/Header";
import api from "@/constants/api";
import { COLORS, formatPrice } from "@/constants";
import { useCart } from "@/context/CartContext";

type PaymentMethod = {
    _id: string;
    name: string;
    accountName?: string;
    image: string;
    accountNumber: string;
};

export default function PaymentScreen() {
    const router = useRouter();
    const { getToken } = useAuth();
    const { clearCart, cartTotal } = useCart();
    const nameInputRef = useRef<TextInput>(null);
    const params = useLocalSearchParams<{
        city?: string;
        state?: string;
        phone?: string;
        street?: string;
        zipCode?: string;
        country?: string;
        paymentType?: string;
    }>();

    const paymentTypeRaw = Array.isArray(params.paymentType) ? params.paymentType[0] : params.paymentType;
    const isCod = paymentTypeRaw === "cod";

    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selected, setSelected] = useState<PaymentMethod | null>(null);
    const [payerName, setPayerName] = useState("");
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [screenshotName, setScreenshotName] = useState("");
    const [copied, setCopied] = useState(false);
    const [shippingAddress, setShippingAddress] = useState({
        street: "",
        city: "",
        state: "",
        phone: "",
        zipCode: "",
        country: "",
    });
    const [deliveryFee, setDeliveryFee] = useState(2);

    const orderTotal = cartTotal + deliveryFee;
    const amountToPay = isCod ? deliveryFee : orderTotal;
    const canPlaceOrder =
        !!selected &&
        methods.length > 0 &&
        payerName.trim().length > 0 &&
        !!screenshot &&
        !!shippingAddress.city &&
        !!shippingAddress.state &&
        !submitting;

    const loadAddress = async () => {
        const fromParams = {
            street: (Array.isArray(params.street) ? params.street[0] : params.street) || "",
            city: (Array.isArray(params.city) ? params.city[0] : params.city) || "",
            state: (Array.isArray(params.state) ? params.state[0] : params.state) || "",
            phone: (Array.isArray(params.phone) ? params.phone[0] : params.phone) || "",
            zipCode: (Array.isArray(params.zipCode) ? params.zipCode[0] : params.zipCode) || "",
            country: (Array.isArray(params.country) ? params.country[0] : params.country) || "",
        };

        if (fromParams.city && fromParams.state) {
            setShippingAddress(fromParams);
            return;
        }

        try {
            const token = await getToken();
            if (!token) return;
            const { data } = await api.get("/addresses", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const list = data?.data || [];
            const preferred = list.find((a: any) => a.isDefault) || list[0];
            if (preferred) {
                setShippingAddress({
                    street: preferred.street || "",
                    city: preferred.city || "",
                    state: preferred.state || "",
                    phone: preferred.phone || "",
                    zipCode: preferred.zipCode || "",
                    country: preferred.country || "",
                });
            } else {
                setShippingAddress(fromParams);
            }
        } catch {
            setShippingAddress(fromParams);
        }
    };

    const fetchMethods = async () => {
        try {
            const { data } = await api.get("/payment-methods");
            if (data.success) {
                setMethods(data.data || []);
                if (data.data?.length > 0) setSelected(data.data[0]);
            }
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Failed to load payments",
                text2: error.response?.data?.message || "Something went wrong",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMethods();
        loadAddress();
        api.get("/settings/delivery")
            .then(({ data }) => {
                if (data.success) setDeliveryFee(Number(data.data.deliveryFee) || 0);
            })
            .catch(() => {});
    }, []);

    const copyAccount = async () => {
        if (!selected?.accountNumber) return;
        await Clipboard.setStringAsync(selected.accountNumber);
        setCopied(true);
        Toast.show({
            type: "success",
            text1: "Copied",
            text2: "Account number copied",
        });
    };

    const pickScreenshot = async () => {
        Keyboard.dismiss();
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
        });
        if (!result.canceled) {
            const asset = result.assets[0];
            setScreenshot(asset.uri);
            const name =
                asset.fileName ||
                asset.uri.split("/").pop()?.split("?")[0] ||
                "receipt.jpg";
            setScreenshotName(decodeURIComponent(name));
        }
    };

    const handleSubmit = async () => {
        if (submitting) return;

        if (!selected) {
            Toast.show({ type: "error", text1: "Select a payment method" });
            return;
        }
        if (!payerName.trim()) {
            Toast.show({ type: "error", text1: "Enter full name" });
            nameInputRef.current?.focus();
            return;
        }
        if (!screenshot) {
            Toast.show({ type: "error", text1: "Upload receipt first" });
            return;
        }
        if (!shippingAddress.city || !shippingAddress.state) {
            Toast.show({
                type: "error",
                text1: "Missing address",
                text2: "Go back and add a shipping address",
            });
            return;
        }
        if (methods.length === 0) {
            Toast.show({ type: "error", text1: "No payment methods available" });
            return;
        }

        setSubmitting(true);
        try {
            const token = await getToken();
            if (!token) {
                Toast.show({ type: "error", text1: "Please sign in again" });
                return;
            }

            const formData = new FormData();

            formData.append(
                "shippingAddress",
                JSON.stringify({
                    street: shippingAddress.street || "",
                    city: shippingAddress.city,
                    state: shippingAddress.state,
                    phone: shippingAddress.phone || "",
                    zipCode: shippingAddress.zipCode || "",
                    country: shippingAddress.country || "",
                })
            );
            formData.append("paymentMethod", isCod ? "cash_on_delivery" : "transfer");
            formData.append("paymentMethodId", selected._id);
            formData.append("paymentMethodName", selected.name);
            formData.append("paymentAccountNumber", selected.accountNumber);
            formData.append("payerName", payerName.trim());
            formData.append("notes", isCod ? "Cash on Delivery — delivery fee paid online" : "Placed via App");

            const rawName = screenshotName || "payment-proof.jpg";
            const safeName =
                rawName.toLowerCase().endsWith(".jpg") ||
                rawName.toLowerCase().endsWith(".jpeg") ||
                rawName.toLowerCase().endsWith(".png")
                    ? rawName
                    : `${rawName}.jpg`;
            const mimeType = safeName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

            if (Platform.OS === "web") {
                const blob = await (await fetch(screenshot)).blob();
                formData.append("paymentScreenshot", new File([blob], safeName, { type: mimeType }));
            } else {
                formData.append("paymentScreenshot", {
                    uri: screenshot,
                    name: safeName,
                    type: mimeType,
                } as any);
            }

            const { data } = await api.post("/orders", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                timeout: 90000,
            });

            if (data.success) {
                await clearCart();
                router.replace("/order-success");
            } else {
                Toast.show({
                    type: "error",
                    text1: "Failed to place order",
                    text2: data.message || "Please try again",
                });
            }
        } catch (error: any) {
            const status = error.response?.status;
            const serverMsg = error.response?.data?.message;
            const isTimeout = error.code === "ECONNABORTED" || String(error.message || "").includes("timeout");
            Toast.show({
                type: "error",
                text1: "Failed to place order",
                text2: isTimeout
                    ? "Upload timed out. Check internet and try again"
                    : serverMsg || error.message || (status ? `Error ${status}` : "Something went wrong"),
            });
            console.error("Place order failed:", status, serverMsg || error.message, error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-surface justify-center items-center">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-surface" edges={["top", "bottom"]}>
            <Header title={isCod ? "Cash on Delivery" : "Payment"} showBack />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
            >
                <ScrollView
                    style={{ flex: 1, paddingHorizontal: 16 }}
                    contentContainerStyle={{ paddingTop: 10, paddingBottom: 24 }}
                    keyboardShouldPersistTaps="always"
                    keyboardDismissMode="on-drag"
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                >
                    {isCod ? (
                        <View className="bg-white px-3 py-3 rounded-xl mb-3 border border-gray-100">
                            <Text className="text-secondary text-sm mb-1">Pay delivery fee only</Text>
                            <Text className="text-2xl font-bold text-primary">{formatPrice(amountToPay)}</Text>
                            <Text className="text-xs mt-2" style={{ color: "#15803D" }}>
                                Product total is paid when your order is delivered.
                            </Text>
                        </View>
                    ) : (
                        <View className="bg-white px-3 py-2.5 rounded-xl mb-3 border border-gray-100">
                            <View className="flex-row items-center justify-between mb-1">
                                <Text className="text-secondary text-sm">Subtotal</Text>
                                <Text className="text-primary font-medium">{formatPrice(cartTotal)}</Text>
                            </View>
                            <View className="flex-row items-center justify-between mb-1">
                                <Text className="text-secondary text-sm">Delivery</Text>
                                <Text className="text-primary font-medium">{formatPrice(deliveryFee)}</Text>
                            </View>
                            <View className="flex-row items-center justify-between mt-1 pt-2 border-t border-gray-100">
                                <Text className="text-secondary text-sm">Amount to pay</Text>
                                <Text className="text-lg font-bold text-primary">{formatPrice(amountToPay)}</Text>
                            </View>
                        </View>
                    )}

                    <Text className="text-base font-bold text-primary mb-2">
                        {isCod ? "Pay Delivery Fee" : "Payment Methods"}
                    </Text>
                    {methods.length === 0 ? (
                        <View className="bg-white p-4 rounded-xl mb-3 items-center">
                            <Text className="text-secondary text-center text-sm">
                                No payment methods yet. Ask admin to add one.
                            </Text>
                        </View>
                    ) : (
                        <View className="flex-row flex-wrap mb-3" style={{ gap: 10 }}>
                            {methods.map((method) => {
                                const active = selected?._id === method._id;
                                return (
                                    <TouchableOpacity
                                        key={method._id}
                                        onPress={() => {
                                            setSelected(method);
                                            setCopied(false);
                                        }}
                                        className={`bg-white rounded-xl border items-center ${
                                            active ? "border-primary" : "border-gray-100"
                                        }`}
                                        style={{ width: 88, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 6 }}
                                    >
                                        <Image
                                            source={{ uri: method.image }}
                                            style={{ width: 44, height: 44, borderRadius: 8 }}
                                            resizeMode="contain"
                                        />
                                        <Text
                                            className="text-primary font-semibold text-xs text-center"
                                            numberOfLines={1}
                                            style={{ marginTop: 4, lineHeight: 14 }}
                                        >
                                            {method.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {selected && (
                        <View className="bg-white p-3 rounded-xl mb-3 border border-gray-100">
                            {!!selected.accountName && (
                                <>
                                    <Text className="text-primary font-medium text-sm mb-1">Account Name</Text>
                                    <View
                                        className="rounded-lg px-3 py-2 mb-2"
                                        style={{ backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: COLORS.primary }}
                                    >
                                        <Text className="font-semibold text-sm" style={{ color: COLORS.primary }}>
                                            {selected.accountName}
                                        </Text>
                                    </View>
                                </>
                            )}

                            <Text className="text-primary font-medium text-sm mb-1">Account Number</Text>
                            <TouchableOpacity
                                onPress={copyAccount}
                                activeOpacity={0.85}
                                className="flex-row items-center rounded-lg px-3 py-2"
                                style={{
                                    backgroundColor: copied ? "#ECFDF5" : "#EFF6FF",
                                    borderWidth: 1,
                                    borderColor: copied ? "#22C55E" : COLORS.primary,
                                }}
                            >
                                <Text
                                    className="font-semibold text-sm flex-1 mr-2"
                                    style={{ color: copied ? "#15803D" : COLORS.primary }}
                                >
                                    {selected.accountNumber}
                                </Text>
                                <View
                                    className="w-8 h-8 rounded-md items-center justify-center"
                                    style={{ backgroundColor: copied ? "#22C55E" : COLORS.primary }}
                                >
                                    <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color="#fff" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    <Text className="text-primary font-medium text-sm mb-1">Full Name</Text>
                    <View
                        style={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            marginBottom: 12,
                            paddingHorizontal: 12,
                            minHeight: 48,
                            justifyContent: "center",
                        }}
                    >
                        <TextInput
                            ref={nameInputRef}
                            style={{
                                color: COLORS.primary,
                                fontSize: 16,
                                paddingVertical: Platform.OS === "ios" ? 12 : 10,
                                includeFontPadding: false,
                            }}
                            placeholder="Name used on the payment"
                            placeholderTextColor={COLORS.secondary}
                            value={payerName}
                            onChangeText={setPayerName}
                            autoCorrect={false}
                            autoCapitalize="words"
                            returnKeyType="done"
                            blurOnSubmit
                            onSubmitEditing={Keyboard.dismiss}
                            underlineColorAndroid="transparent"
                        />
                    </View>

                    <Text className="text-primary font-medium text-sm mb-1">Upload Receipt</Text>
                    <TouchableOpacity
                        onPress={pickScreenshot}
                        activeOpacity={0.85}
                        className="bg-white mb-3 overflow-hidden"
                        style={{
                            borderRadius: 999,
                            borderWidth: 1.5,
                            borderStyle: "dashed",
                            borderColor: "#D1D5DB",
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            minHeight: 44,
                            flexDirection: "row",
                            alignItems: "center",
                        }}
                    >
                        {screenshot ? (
                            <>
                                <Image
                                    source={{ uri: screenshot }}
                                    style={{ width: 28, height: 28, borderRadius: 6 }}
                                    resizeMode="cover"
                                />
                                <Text
                                    className="flex-1 mx-2 font-medium text-sm"
                                    style={{ color: COLORS.primary }}
                                    numberOfLines={1}
                                >
                                    {screenshotName || "Receipt uploaded"}
                                </Text>
                                <Ionicons name="cloud-upload-outline" size={18} color={COLORS.primary} />
                            </>
                        ) : (
                            <>
                                <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
                                <Text className="ml-2 font-medium text-sm" style={{ color: COLORS.primary }}>
                                    Upload Receipt
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => {
                            Keyboard.dismiss();
                            handleSubmit();
                        }}
                        disabled={submitting}
                        activeOpacity={0.85}
                        className="py-3.5 rounded-xl items-center mt-2"
                        style={{
                            backgroundColor: canPlaceOrder ? COLORS.primary : submitting ? "#93C5FD" : COLORS.primary,
                            opacity: canPlaceOrder || submitting ? 1 : 0.55,
                        }}
                    >
                        {submitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold text-base">
                                {isCod
                                    ? `Pay Delivery ${formatPrice(amountToPay)}`
                                    : "Place Order"}
                            </Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

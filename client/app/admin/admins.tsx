import { useAuth, useUser } from "@clerk/clerk-expo";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    Platform,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    type KeyboardEvent,
} from "react-native";
import Toast from "react-native-toast-message";
import { useFocusEffect, useRouter } from "expo-router";
import api from "@/constants/api";
import { COLORS, OWNER_EMAIL, isOwnerAccount } from "@/constants";

type AdminUser = {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
    role: string;
    image?: string;
    createdAt?: string;
};

export default function AdminUsers() {
    const { getToken } = useAuth();
    const { user: currentUser } = useUser();
    const router = useRouter();
    const scrollRef = useRef<ScrollView>(null);
    const [keyboardPad, setKeyboardPad] = useState(0);
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);

    const [email, setEmail] = useState("");

    useEffect(() => {
        const onShow = (e: KeyboardEvent) => {
            setKeyboardPad(e.endCoordinates?.height ?? 0);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
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
    }, []);

    const scrollToButton = () => {
        setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 120);
    };

    const fetchAdmins = async () => {
        try {
            const token = await getToken();
            const { data } = await api.get("/admin/admins", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) setAdmins(data.data || []);
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Failed to load admins",
                text2:
                    error.response?.data?.message ||
                    (error.response?.status === 404
                        ? "Admin API not deployed yet. Push server to Render."
                        : error.message) ||
                    "Something went wrong",
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (!isOwnerAccount(currentUser)) {
                Toast.show({
                    type: "error",
                    text1: "Owner only",
                    text2: "Only the owner can manage admins",
                });
                router.replace("/admin");
                return;
            }
            fetchAdmins();
        }, [currentUser])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchAdmins();
    };

    const handleAddAdmin = async () => {
        if (!email.trim()) {
            Toast.show({ type: "error", text1: "Email is required" });
            return;
        }

        try {
            setSaving(true);
            const token = await getToken();
            const { data } = await api.post(
                "/admin/admins",
                { email: email.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (data.success) {
                Toast.show({ type: "success", text1: "Admin added" });
                setEmail("");
                await fetchAdmins();
            }
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Add admin failed",
                text2:
                    error.response?.data?.message ||
                    (error.response?.status === 404
                        ? "Admin API not deployed yet. Push server to Render."
                        : error.message) ||
                    "Something went wrong",
            });
        } finally {
            setSaving(false);
        }
    };

    const doRemove = async (id: string) => {
        try {
            setRemovingId(id);
            const token = await getToken();
            const { data } = await api.delete(`/admin/admins/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) {
                Toast.show({ type: "success", text1: "Admin removed" });
                await fetchAdmins();
            }
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Remove failed",
                text2: error.response?.data?.message || "Something went wrong",
            });
        } finally {
            setRemovingId(null);
        }
    };

    const myEmails = new Set(
        [
            currentUser?.primaryEmailAddress?.emailAddress,
            ...(currentUser?.emailAddresses?.map((e) => e.emailAddress) || []),
        ]
            .filter(Boolean)
            .map((e) => String(e).toLowerCase())
    );

    const isSelf = (admin: AdminUser) =>
        !!admin.email && myEmails.has(admin.email.toLowerCase());

    /** Only the real owner email is protected — other admins/super_admins can be removed */
    const isOwnerRow = (admin: AdminUser) =>
        !!OWNER_EMAIL &&
        !!admin.email &&
        admin.email.trim().toLowerCase() === OWNER_EMAIL;

    const confirmRemove = (admin: AdminUser) => {
        if (isSelf(admin)) {
            Toast.show({
                type: "error",
                text1: "Cannot remove yourself",
                text2: "Sign in with the owner email to remove another admin",
            });
            return;
        }
        if (isOwnerRow(admin)) {
            Toast.show({
                type: "error",
                text1: "Cannot remove owner",
                text2: "The owner account cannot be removed",
            });
            return;
        }

        const label = admin.email || admin.name || "this admin";
        if (Platform.OS === "web") {
            if (window.confirm(`Remove admin access for ${label}?`)) {
                doRemove(admin._id);
            }
            return;
        }

        Alert.alert("Remove Admin", `Remove admin access for ${label}?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: () => doRemove(admin._id) },
        ]);
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-surface">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
            <ScrollView
                ref={scrollRef}
                className="flex-1 bg-surface"
                contentContainerStyle={{ padding: 16, paddingBottom: Math.max(40, keyboardPad + 24) }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
                    <Text className="text-lg font-bold text-primary mb-1">Add New Admin</Text>
                    <Text className="text-secondary text-sm mb-4">
                        Enter the email of someone who already has an account to make them admin.
                    </Text>

                    <Text className="text-primary font-medium mb-2">Email *</Text>
                    <TextInput
                        className="w-full bg-surface p-4 rounded-xl text-black mb-4"
                        placeholder="admin@example.com"
                        placeholderTextColor="#999"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={email}
                        onChangeText={setEmail}
                        onFocus={scrollToButton}
                        returnKeyType="done"
                        onSubmitEditing={handleAddAdmin}
                    />

                    <TouchableOpacity
                        className={`py-4 rounded-full items-center ${
                            saving || !email.trim() ? "bg-gray-300" : "bg-primary"
                        }`}
                        onPress={handleAddAdmin}
                        disabled={saving || !email.trim()}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white font-bold text-base">Add Admin</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <Text className="text-primary font-bold text-xl mb-3">Current Admins</Text>
                {admins.length === 0 ? (
                    <View className="bg-white p-6 rounded-2xl border border-gray-100 items-center">
                        <Text className="text-secondary">No admins found</Text>
                    </View>
                ) : (
                    admins.map((admin) => {
                        const isMe = isSelf(admin);
                        const owner = isOwnerRow(admin);
                        const canRemove = !isMe && !owner;

                        return (
                            <View
                                key={admin._id}
                                className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 flex-row items-center"
                            >
                                <View className="w-11 h-11 rounded-full bg-surface items-center justify-center mr-3">
                                    <Text className="text-primary font-bold text-base">
                                        {(admin.name || admin.email || "?").charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View className="flex-1 mr-2">
                                    <Text className="text-primary font-bold" numberOfLines={1}>
                                        {admin.name || "Admin"}
                                        {isMe ? " (You)" : ""}
                                        {owner ? " · Owner" : ""}
                                    </Text>
                                    <Text className="text-secondary text-sm" numberOfLines={1}>
                                        {admin.email || admin.phone || "No email"}
                                    </Text>
                                </View>
                                {canRemove ? (
                                    <TouchableOpacity
                                        onPress={() => confirmRemove(admin)}
                                        disabled={removingId === admin._id}
                                        className="px-3 py-2 rounded-full bg-red-50"
                                    >
                                        {removingId === admin._id ? (
                                            <ActivityIndicator size="small" color="#EF4444" />
                                        ) : (
                                            <Text className="text-red-500 font-medium text-xs">Remove</Text>
                                        )}
                                    </TouchableOpacity>
                                ) : (
                                    <Text className="text-secondary text-xs">
                                        {isMe ? "You" : "Owner"}
                                    </Text>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
    );
}

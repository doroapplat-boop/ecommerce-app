import { useAuth, useUser } from "@clerk/clerk-expo";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useFocusEffect, useRouter } from "expo-router";
import api from "@/constants/api";
import { COLORS, OWNER_EMAIL, isOwnerAccount } from "@/constants";

type AppUser = {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
    role: string;
    createdAt?: string;
};

export default function AdminAllUsers() {
    const { getToken } = useAuth();
    const { user: currentUser } = useUser();
    const router = useRouter();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [query, setQuery] = useState("");

    const myEmails = new Set(
        [
            currentUser?.primaryEmailAddress?.emailAddress,
            ...(currentUser?.emailAddresses?.map((e) => e.emailAddress) || []),
        ]
            .filter(Boolean)
            .map((e) => String(e).toLowerCase())
    );

    const fetchUsers = async () => {
        try {
            const token = await getToken();
            const { data } = await api.get("/admin/users", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) setUsers(data.data || []);
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Failed to load users",
                text2: error.response?.data?.message || error.message || "Something went wrong",
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
                    text2: "Only the owner can manage users",
                });
                router.replace("/admin");
                return;
            }
            fetchUsers();
        }, [currentUser])
    );

    const doDelete = async (id: string) => {
        try {
            setDeletingId(id);
            const token = await getToken();
            const { data } = await api.delete(`/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) {
                Toast.show({ type: "success", text1: "User deleted" });
                await fetchUsers();
            }
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Delete failed",
                text2: error.response?.data?.message || "Something went wrong",
            });
        } finally {
            setDeletingId(null);
        }
    };

    const confirmDelete = (u: AppUser) => {
        if (u.email && myEmails.has(u.email.toLowerCase())) {
            Toast.show({ type: "error", text1: "You cannot delete yourself" });
            return;
        }
        if (OWNER_EMAIL && u.email && u.email.trim().toLowerCase() === OWNER_EMAIL) {
            Toast.show({ type: "error", text1: "Cannot delete owner account" });
            return;
        }

        const label = u.email || u.name || "this user";
        if (Platform.OS === "web") {
            if (window.confirm(`Delete account ${label}?`)) doDelete(u._id);
            return;
        }

        Alert.alert("Delete user", `Delete account for ${label}? This cannot be undone.`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => doDelete(u._id) },
        ]);
    };

    const filtered = users.filter((u) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
            (u.email || "").toLowerCase().includes(q) ||
            (u.name || "").toLowerCase().includes(q) ||
            (u.phone || "").toLowerCase().includes(q) ||
            (u.role || "").toLowerCase().includes(q)
        );
    });

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-surface">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-surface"
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        fetchUsers();
                    }}
                />
            }
        >
            <Text className="text-primary font-bold text-xl mb-1">All Users</Text>
            <Text className="text-secondary text-sm mb-4">
                Owner only — view every account email and delete users.
            </Text>

            <TextInput
                className="bg-white border border-gray-100 p-4 rounded-xl text-black mb-4"
                placeholder="Search email, name, role..."
                placeholderTextColor="#999"
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
            />

            <Text className="text-secondary text-xs mb-3">
                {filtered.length} account{filtered.length === 1 ? "" : "s"}
            </Text>

            {filtered.length === 0 ? (
                <View className="bg-white p-6 rounded-2xl border border-gray-100 items-center">
                    <Text className="text-secondary">No users found</Text>
                </View>
            ) : (
                filtered.map((u) => {
                    const isMe = !!u.email && myEmails.has(u.email.toLowerCase());
                    const isOwner =
                        !!OWNER_EMAIL &&
                        !!u.email &&
                        u.email.trim().toLowerCase() === OWNER_EMAIL;
                    const canDelete = !isMe && !isOwner;

                    return (
                        <View
                            key={u._id}
                            className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 flex-row items-center"
                        >
                            <View className="w-11 h-11 rounded-full bg-surface items-center justify-center mr-3">
                                <Text className="text-primary font-bold text-base">
                                    {(u.name || u.email || "?").charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View className="flex-1 mr-2">
                                <Text className="text-primary font-bold" numberOfLines={1}>
                                    {u.name || "User"}
                                    {isMe ? " (You)" : ""}
                                    {isOwner ? " · Owner" : ""}
                                </Text>
                                <Text className="text-secondary text-sm" numberOfLines={1}>
                                    {u.email || u.phone || "No email"}
                                </Text>
                                <Text className="text-secondary text-xs mt-0.5 capitalize">{u.role}</Text>
                            </View>
                            {canDelete ? (
                                <TouchableOpacity
                                    onPress={() => confirmDelete(u)}
                                    disabled={deletingId === u._id}
                                    className="px-3 py-2 rounded-full bg-red-50"
                                >
                                    {deletingId === u._id ? (
                                        <ActivityIndicator size="small" color="#EF4444" />
                                    ) : (
                                        <Text className="text-red-500 font-medium text-xs">Delete</Text>
                                    )}
                                </TouchableOpacity>
                            ) : (
                                <Text className="text-secondary text-xs">{isMe ? "You" : "Owner"}</Text>
                            )}
                        </View>
                    );
                })
            )}
        </ScrollView>
    );
}

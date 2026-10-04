import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth, useClerk, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import Header from "@/components/Header";
import api from "@/constants/api";
import { APP_NAME, DELETE_ACCOUNT_URL, SUPPORT_EMAIL } from "@/constants";

export default function DeleteAccountScreen() {
    const router = useRouter();
    const { user } = useUser();
    const { signOut } = useClerk();
    const { getToken } = useAuth();
    const [confirmText, setConfirmText] = useState("");
    const [loading, setLoading] = useState(false);

    const email =
        user?.primaryEmailAddress?.emailAddress ||
        user?.emailAddresses?.[0]?.emailAddress ||
        "";

    const doDelete = async () => {
        if (confirmText.trim().toUpperCase() !== "DELETE") {
            Toast.show({
                type: "error",
                text1: "Type DELETE to confirm",
            });
            return;
        }

        try {
            setLoading(true);
            const token = await getToken();
            try {
                await api.delete("/users/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });
            } catch {
                // Continue with Clerk deletion
            }

            if (user) {
                await user.delete();
            }

            await signOut();
            Toast.show({
                type: "success",
                text1: "Account deleted",
                text2: "Your account and related data were removed",
            });
            router.replace("/sign-in");
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Could not delete account",
                text2:
                    error?.errors?.[0]?.longMessage ||
                    error?.message ||
                    "Use Contact support below, or Help Center",
            });
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = () => {
        if (Platform.OS === "web") {
            if (window.confirm("Permanently delete your account?")) doDelete();
            return;
        }
        Alert.alert(
            "Delete account?",
            "This permanently deletes your account, cart, wishlist, and addresses. Orders may be retained for legal records.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: doDelete },
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
            <StatusBar style="dark" />
            <Header title="Delete Account" showBack />

            <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
                <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
                    <Text className="text-primary font-bold text-xl mb-2">Delete your {APP_NAME} account</Text>
                    <Text className="text-secondary text-sm mb-4 leading-5">
                        This removes your login account and personal app data (profile links, cart,
                        wishlist, addresses). Some order records may be kept if required by law.
                    </Text>

                    <Text className="text-primary font-medium mb-2">Type DELETE to confirm</Text>
                    <TextInput
                        className="bg-surface p-4 rounded-xl text-black mb-4"
                        placeholder="DELETE"
                        placeholderTextColor="#999"
                        autoCapitalize="characters"
                        value={confirmText}
                        onChangeText={setConfirmText}
                    />

                    <TouchableOpacity
                        disabled={loading || confirmText.trim().toUpperCase() !== "DELETE"}
                        onPress={confirmDelete}
                        className={`py-4 rounded-full items-center mb-3 ${
                            loading || confirmText.trim().toUpperCase() !== "DELETE"
                                ? "bg-gray-300"
                                : "bg-red-500"
                        }`}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white font-bold">Delete my account</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => Linking.openURL(DELETE_ACCOUNT_URL)}>
                        <Text className="text-primary text-center font-medium underline mb-3">
                            Open web account-deletion page
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() =>
                            Linking.openURL(
                                `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                                    `${APP_NAME} account deletion request`
                                )}&body=${encodeURIComponent(
                                    `Please delete my account.${email ? `\nAccount: ${email}` : ""}`
                                )}`
                            )
                        }
                    >
                        <Text className="text-secondary text-center text-sm underline">
                            Contact support for help
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

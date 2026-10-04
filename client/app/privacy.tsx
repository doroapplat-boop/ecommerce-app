import React from "react";
import { Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Header from "@/components/Header";
import {
    APP_NAME,
    PRIVACY_POLICY_URL,
    SUPPORT_PHONE_DISPLAY,
} from "@/constants";

export default function PrivacyPolicyScreen() {
    return (
        <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
            <StatusBar style="dark" />
            <Header title="Privacy Policy" showBack />

            <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
                <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
                    <Text className="text-primary font-bold text-xl mb-2">{APP_NAME} Privacy Policy</Text>
                    <Text className="text-secondary text-xs mb-4">Last updated: October 4, 2026</Text>

                    <Text className="text-primary font-bold mb-2">1. Who we are</Text>
                    <Text className="text-secondary text-sm mb-4 leading-5">
                        {APP_NAME} (“we”, “us”) is an ecommerce shopping app. This policy explains what
                        information we collect, how we use it, and your choices.
                    </Text>

                    <Text className="text-primary font-bold mb-2">2. Information we collect</Text>
                    <Text className="text-secondary text-sm mb-2 leading-5">
                        Depending on how you use the app, we may collect:
                    </Text>
                    <Text className="text-secondary text-sm mb-1">• Account info: name, email, phone (via Clerk sign-in)</Text>
                    <Text className="text-secondary text-sm mb-1">• Shipping addresses you save</Text>
                    <Text className="text-secondary text-sm mb-1">• Orders, cart, and wishlist activity</Text>
                    <Text className="text-secondary text-sm mb-1">• Payment proof images you upload for orders</Text>
                    <Text className="text-secondary text-sm mb-4">
                        • Device info needed for login sessions and optional push notifications
                    </Text>

                    <Text className="text-primary font-bold mb-2">3. How we use information</Text>
                    <Text className="text-secondary text-sm mb-4 leading-5">
                        We use your information to create your account, process orders, deliver products,
                        show order status, provide customer support, improve the app, and send optional
                        notifications about your orders.
                    </Text>

                    <Text className="text-primary font-bold mb-2">4. Sharing</Text>
                    <Text className="text-secondary text-sm mb-4 leading-5">
                        We share data with service providers that help run the app, including Clerk
                        (authentication), our hosting/database provider, and cloud image storage for
                        product/payment images. We do not sell your personal information. We do not use
                        third-party advertising SDKs such as AdMob in this app.
                    </Text>

                    <Text className="text-primary font-bold mb-2">5. Retention</Text>
                    <Text className="text-secondary text-sm mb-4 leading-5">
                        We keep account and order records as long as needed to provide the service, meet
                        legal/accounting needs, and resolve disputes. You may request deletion of your
                        account and associated personal data.
                    </Text>

                    <Text className="text-primary font-bold mb-2">6. Your rights</Text>
                    <Text className="text-secondary text-sm mb-4 leading-5">
                        You can update profile details, manage addresses, and request account deletion
                        from Settings → Delete account, or from our web deletion page.
                    </Text>

                    <Text className="text-primary font-bold mb-2">7. Contact</Text>
                    <Text className="text-secondary text-sm mb-4">
                        Use Help Center in the app, or call {SUPPORT_PHONE_DISPLAY}.
                    </Text>

                    <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
                        <Text className="text-primary font-semibold underline">
                            Open full privacy page online
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

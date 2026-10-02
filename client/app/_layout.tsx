import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { ClerkProvider } from "@clerk/clerk-expo";
import { useFonts } from "expo-font";
import {
    NotoSansEthiopic_400Regular,
    NotoSansEthiopic_500Medium,
    NotoSansEthiopic_600SemiBold,
    NotoSansEthiopic_700Bold,
} from "@expo-google-fonts/noto-sans-ethiopic";
import * as SplashScreen from "expo-splash-screen";
import Toast from "react-native-toast-message";
import { applyAmharicDefaultFont } from "@/constants/fonts";
import { COLORS } from "@/constants";
import "@/global.css";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        NotoSansEthiopic_400Regular,
        NotoSansEthiopic_500Medium,
        NotoSansEthiopic_600SemiBold,
        NotoSansEthiopic_700Bold,
    });

    useEffect(() => {
        if (fontsLoaded) {
            applyAmharicDefaultFont();
            SplashScreen.hideAsync().catch(() => {});
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ClerkProvider tokenCache={tokenCache} publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
                <CartProvider>
                    <WishlistProvider>
                        <Stack screenOptions={{ headerShown: false }} />
                        <Toast />
                    </WishlistProvider>
                </CartProvider>
            </ClerkProvider>
        </GestureHandlerRootView>
    );
}

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@/constants";
import api from "@/constants/api";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32;
const IMAGE_HEIGHT = CARD_WIDTH * 0.62;

type Banner = {
    _id: string;
    title: string;
    subtitle?: string;
    buttonText?: string;
    image: string;
};

export default function BannerDetails() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        id: string;
        title?: string;
        subtitle?: string;
        image?: string;
    }>();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const [banner, setBanner] = useState<Banner | null>(() => {
        if (params.image || params.title) {
            return {
                _id: id || "",
                title: Array.isArray(params.title) ? params.title[0] : params.title || "",
                subtitle: Array.isArray(params.subtitle) ? params.subtitle[0] : params.subtitle || "",
                image: Array.isArray(params.image) ? params.image[0] : params.image || "",
            };
        }
        return null;
    });

    const [pageLoading, setPageLoading] = useState(true);
    const [imageLoading, setImageLoading] = useState(true);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const load = async () => {
            setPageLoading(true);
            setImageLoading(true);
            fadeAnim.setValue(0);

            try {
                if (id) {
                    const { data } = await api.get("/banners");
                    if (data.success) {
                        const found = data.data.find((item: Banner) => String(item._id) === String(id));
                        if (found && !cancelled) setBanner(found);
                    }
                }
            } catch (error) {
                console.error("Error fetching banner:", error);
            } finally {
                timer = setTimeout(() => {
                    if (!cancelled) setPageLoading(false);
                }, 400);
            }
        };

        load();
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [id]);

    useEffect(() => {
        if (!banner?.image) setImageLoading(false);
    }, [banner?.image]);

    useEffect(() => {
        if (!pageLoading && !imageLoading) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 320,
                useNativeDriver: true,
            }).start();
        }
    }, [pageLoading, imageLoading, fadeAnim]);

    if (pageLoading) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center" style={{ backgroundColor: "#F3F4F6" }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text className="mt-3" style={{ color: "#6B7280" }}>
                    Loading...
                </Text>
            </SafeAreaView>
        );
    }

    if (!banner) {
        return (
            <SafeAreaView className="flex-1" style={{ backgroundColor: "#F3F4F6" }} edges={["top"]}>
                <View className="px-4 py-3 flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{ backgroundColor: "#E5E7EB" }}
                    >
                        <Ionicons name="chevron-back" size={22} color="#111" />
                    </TouchableOpacity>
                    <Text className="flex-1 text-center text-lg font-semibold mr-10" style={{ color: "#111" }}>
                        Promotional Content
                    </Text>
                </View>
                <View className="flex-1 justify-center items-center">
                    <Text style={{ color: "#6B7280" }}>Banner not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: "#F3F4F6" }} edges={["top"]}>
            <View className="px-4 py-3 flex-row items-center">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: "#E5E7EB" }}
                >
                    <Ionicons name="chevron-back" size={22} color="#111" />
                </TouchableOpacity>
                <Text className="flex-1 text-center text-lg font-semibold mr-10" style={{ color: "#111" }}>
                    Promotional Content
                </Text>
            </View>

            {imageLoading && (
                <View className="absolute inset-0 z-10 items-center justify-center" style={{ backgroundColor: "#F3F4F6" }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            )}

            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View
                        style={{
                            backgroundColor: "#fff",
                            borderRadius: 24,
                            overflow: "hidden",
                            shadowColor: "#000",
                            shadowOpacity: 0.08,
                            shadowRadius: 16,
                            shadowOffset: { width: 0, height: 6 },
                            elevation: 4,
                        }}
                    >
                        <View style={{ width: CARD_WIDTH, height: IMAGE_HEIGHT, backgroundColor: "#E5E7EB" }}>
                            {!!banner.image && (
                                <Image
                                    source={{ uri: banner.image }}
                                    style={{ width: "100%", height: "100%" }}
                                    resizeMode="cover"
                                    onLoadStart={() => setImageLoading(true)}
                                    onLoadEnd={() => setImageLoading(false)}
                                    onError={() => setImageLoading(false)}
                                />
                            )}
                            <View
                                style={{
                                    position: "absolute",
                                    top: 14,
                                    right: 14,
                                    backgroundColor: COLORS.primary,
                                    paddingHorizontal: 12,
                                    paddingVertical: 5,
                                    borderRadius: 8,
                                }}
                            >
                                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 0.6 }}>
                                    PROMO
                                </Text>
                            </View>
                        </View>

                        <View style={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 28 }}>
                            <Text
                                style={{
                                    color: "#111",
                                    fontSize: 20,
                                    fontWeight: "800",
                                    textAlign: "center",
                                    marginBottom: 14,
                                    lineHeight: 28,
                                }}
                            >
                                {banner.title}
                            </Text>

                            {!!banner.subtitle && (
                                <Text
                                    style={{
                                        color: "#111",
                                        fontSize: 15,
                                        lineHeight: 24,
                                        textAlign: "center",
                                        marginBottom: 18,
                                    }}
                                >
                                    {banner.subtitle}
                                </Text>
                            )}

                            {!!banner.buttonText && (
                                <TouchableOpacity
                                    onPress={() => router.push("/shop")}
                                    style={{
                                        marginTop: 4,
                                        alignSelf: "center",
                                        backgroundColor: COLORS.primary,
                                        paddingHorizontal: 28,
                                        paddingVertical: 12,
                                        borderRadius: 999,
                                    }}
                                >
                                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                                        {banner.buttonText}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
}

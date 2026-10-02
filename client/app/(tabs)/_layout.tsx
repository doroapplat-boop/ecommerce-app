import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/constants";
import Feather from "@expo/vector-icons/Feather";
import { useCart } from "@/context/CartContext";

export default function TabLayout() {
    const { itemCount } = useCart();
    const insets = useSafeAreaInsets();
    const bottomPad = Math.max(insets.bottom, Platform.OS === "android" ? 14 : 10);
    const cartBadge = itemCount > 0 ? (itemCount > 99 ? "99+" : String(itemCount)) : undefined;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: "#9CA3AF",
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: "#fff",
                    borderTopWidth: 1,
                    borderTopColor: "#F0F0F0",
                    height: 56 + bottomPad,
                    paddingTop: 8,
                    paddingBottom: bottomPad,
                    elevation: 8,
                    shadowColor: "#000",
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: -2 },
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "home" : "home-outline"} size={26} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="cart"
                options={{
                    tabBarIcon: ({ color }) => (
                        <View style={{ width: 32, height: 28, alignItems: "center", justifyContent: "center" }}>
                            <Feather name="shopping-cart" size={26} color={color} />
                            {!!cartBadge && (
                                <View
                                    style={{
                                        position: "absolute",
                                        top: -4,
                                        right: -8,
                                        minWidth: 16,
                                        height: 16,
                                        borderRadius: 8,
                                        backgroundColor: "#EF4444",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        paddingHorizontal: 3,
                                        borderWidth: 1.5,
                                        borderColor: "#FFFFFF",
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: "#FFFFFF",
                                            fontSize: 9,
                                            fontWeight: "700",
                                            includeFontPadding: false,
                                            textAlign: "center",
                                        }}
                                    >
                                        {cartBadge}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "receipt" : "receipt-outline"} size={26} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "person" : "person-outline"} size={26} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="favorites"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}

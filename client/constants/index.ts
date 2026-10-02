export const COLORS = {
    primary: "#1E40AF",
    secondary: "#64748B",
    background: "#FFFFFF",
    surface: "#F1F5F9",
    accent: "#3B82F6",
    border: "#E2E8F0",
    error: "#FF4444",
};

export const CURRENCY = "birr";

export const formatPrice = (amount: number | string | undefined | null) => {
    const value = Number(amount) || 0;
    return `${value.toFixed(2)} ${CURRENCY}`;
};

// Kept for fallback references; live categories come from /api/categories
export const CATEGORIES = [
    { id: 1, name: "Men", icon: "shirt-outline" },
    { id: 2, name: "Women", icon: "sparkles-outline" },
    { id: 3, name: "Kids", icon: "balloon-outline" },
    { id: 4, name: "Shoes", icon: "walk-outline" },
    { id: 5, name: "Bags", icon: "bag-handle-outline" },
    { id: 6, name: "Other", icon: "apps-outline" },
];

export const PROFILE_MENU = [
    { id: 1, title: "My Orders", icon: "receipt-outline", route: "/orders" },
    { id: 2, title: "Shipping Addresses", icon: "location-outline", route: "/addresses" },
    { id: 5, title: "Settings", icon: "settings-outline", route: "/settings" },
];

export const getStatusColor = (status: string) => {
    switch (status) {
        case "placed":
            return "bg-yellow-50 text-yellow-900";
        case "processing":
            return "bg-indigo-50 text-indigo-900";
        case "shipped":
            return "bg-purple-50 text-purple-900";
        case "delivered":
            return "bg-green-50 text-green-900";
        case "cancelled":
            return "bg-red-50 text-red-900";
        default:
            return "bg-gray-50 text-gray-900";
    }
};

export const COLORS = {
    primary: "#1E40AF",
    secondary: "#64748B",
    background: "#FFFFFF",
    surface: "#F1F5F9",
    accent: "#3B82F6",
    border: "#E2E8F0",
    error: "#FF4444",
};

/** Display name — use this everywhere the app name is shown */
export const APP_NAME = "GUZO SHOP";

/** Owner email (same as server ADMIN_EMAIL) — unlocks Admins + Payments + Admin button */
export const OWNER_EMAIL = String(
    process.env.EXPO_PUBLIC_OWNER_EMAIL || "doroapplat@gmail.com"
)
    .replace(/["']/g, "")
    .trim()
    .toLowerCase();

function userEmails(user: {
    primaryEmailAddress?: { emailAddress?: string | null } | null;
    emailAddresses?: { emailAddress?: string | null }[] | null;
} | null | undefined) {
    return [
        user?.primaryEmailAddress?.emailAddress,
        ...(user?.emailAddresses?.map((e) => e.emailAddress) || []),
    ]
        .filter(Boolean)
        .map((e) => String(e).trim().toLowerCase());
}

export function isOwnerAccount(user: {
    publicMetadata?: Record<string, unknown> | null;
    primaryEmailAddress?: { emailAddress?: string | null } | null;
    emailAddresses?: { emailAddress?: string | null }[] | null;
} | null | undefined) {
    if (!user) return false;
    if (OWNER_EMAIL && userEmails(user).includes(OWNER_EMAIL)) return true;
    return user.publicMetadata?.role === "super_admin";
}

/** Admin Panel button — owner email OR admin/super_admin role */
export function isStaffAccount(user: {
    publicMetadata?: Record<string, unknown> | null;
    primaryEmailAddress?: { emailAddress?: string | null } | null;
    emailAddresses?: { emailAddress?: string | null }[] | null;
} | null | undefined) {
    if (!user) return false;
    if (isOwnerAccount(user)) return true;
    const role = user.publicMetadata?.role;
    return role === "admin" || role === "super_admin";
}

export const CURRENCY = "birr";

/** Support contact — shown in Profile, Settings, and hamburger menu */
export const SUPPORT_PHONE = "+251977617278";
export const SUPPORT_PHONE_DISPLAY = "+251 977 617 278";
export const SUPPORT_EMAIL = "doroapplat@gmail.com";

/** Public Play Store / legal URLs (must stay live, not PDF) */
export const PRIVACY_POLICY_URL =
    process.env.EXPO_PUBLIC_PRIVACY_URL || "https://ecommerce-app-ph3n.onrender.com/privacy";
export const DELETE_ACCOUNT_URL =
    process.env.EXPO_PUBLIC_DELETE_ACCOUNT_URL ||
    "https://ecommerce-app-ph3n.onrender.com/delete-account";

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
    {
        id: 6,
        title: "Help Center",
        icon: "headset-outline",
        route: "/support",
        subtitle: SUPPORT_PHONE_DISPLAY,
    },
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

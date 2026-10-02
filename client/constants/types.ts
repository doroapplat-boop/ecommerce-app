export interface User {
    _id: string;
    name: string;
    email: string;
    role: "user" | "admin";
    phone?: string;
    address?: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    createdAt: string;
}

export interface Product {
    _id: string;
    name: string;
    description: string;
    price: number;
    comparePrice?: number;
    images: string[];
    category:
        | {
              _id: string;
              name: string;
          }
        | string;
    stock: number;
    ratings: {
        average: number;
        count: number;
    };
    isFeatured: boolean;
    isActive: boolean;
    createdAt: string;
}

export type ProductCardProps = {
    product: Product;
};

export interface CartItem {
    product: Product;
    quantity: number;
}

export type CartItemProps = {
    item: { id: string; product: { name: string; price: number; images: string[] }; quantity: number };
    onRemove?: () => void;
    onUpdateQuantity?: (newQty: number) => void;
    removing?: boolean;
};

export type CategoryItemProps = {
    item: { id: string | number; name: string; icon?: string; image?: string };
    isSelected?: boolean;
    onPress?: () => void;
};

export interface Category {
    _id: string;
    name: string;
    image?: string;
    icon?: string;
    isActive: boolean;
    sortOrder: number;
}

export type HeaderProps = {
    title?: string;
    showBack?: boolean;
    showSearch?: boolean;
    showCart?: boolean;
    showWishlist?: boolean;
    showMenu?: boolean;
    showLogo?: boolean;
    /** Home-style branded header (rounded bottom + pill search) using app primary color */
    branded?: boolean;
    searchValue?: string;
    onSearchChange?: (text: string) => void;
    onSearchSubmit?: () => void;
    searchPlaceholder?: string;
};

export interface Address {
    _id: string;
    type: "Home" | "Work" | "Other";
    street: string;
    city: string;
    state: string;
    phone?: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
    createdAt: string;
}

export interface OrderItem {
    product: Product | string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
}

export interface Order {
    _id: string;
    user: User | string;
    orderNumber: string;
    items: OrderItem[];
    shippingAddress: {
        street: string;
        city: string;
        state: string;
        phone?: string;
        zipCode: string;
        country: string;
    };
    paymentMethod: string;
    paymentMethodName?: string;
    paymentAccountNumber?: string;
    payerName?: string;
    paymentScreenshot?: string;
    paymentStatus: "pending" | "paid" | "failed" | "refunded";
    orderStatus: "placed" | "processing" | "shipped" | "delivered" | "cancelled";
    subtotal: number;
    shippingCost: number;
    tax: number;
    totalAmount: number;
    amountPaidOnline?: number;
    amountDueOnDelivery?: number;
    notes?: string;
    deliveredAt?: string;
    createdAt: string;
}

export type WishlistContextType = {
    wishlist: Product[];
    toggleWishlist: (product: Product) => void;
    isInWishlist: (productId: string) => boolean;
    loading: boolean;
};

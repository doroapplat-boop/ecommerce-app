import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import api from '@/constants/api';
import { Product } from '@/constants/types';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

export { Product };

export type CartItem = {
    id: string;
    productId: string;
    product: Product;
    quantity: number;
    price: number;
};

type CartContextType = {
    cartItems: CartItem[];
    addToCart: (product: Product, quantity?: number) => Promise<boolean>;
    removeFromCart: (itemId: string) => Promise<void>;
    updateQuantity: (itemId: string, quantity: number) => Promise<void>;
    clearCart: () => Promise<void>;
    cartTotal: number;
    itemCount: number;
    isLoading: boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const { isSignedIn, getToken } = useAuth();
    const { user } = useUser();

    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [cartTotal, setCartTotal] = useState(0);

    /** Sync role with server (owner → super_admin in Clerk metadata) */
    const syncSession = async () => {
        try {
            const token = await getToken();
            if (!token) return;
            await api.get("/users/me", { headers: { Authorization: `Bearer ${token}` } });
            await user?.reload?.();
        } catch (error) {
            console.error("Failed to sync session:", error);
        }
    };

    const fetchCart = async () => {
        try {
            setIsLoading(true);
            const token = await getToken();
            if (!token) return;
            const { data } = await api.get('/cart', { headers: { Authorization: `Bearer ${token}` } });
            if (data.success && data.data) {
                const serverCart = data.data;
                const mappedItems: CartItem[] = serverCart.items.map((item: any) => ({
                    id: item.product._id,
                    productId: item.product._id,
                    product: item.product,
                    quantity: item.quantity,
                    price: item.price
                }));
                setCartItems(mappedItems);
                setCartTotal(serverCart.totalAmount);
            }
        } catch (error) {
            console.error("Failed to fetch cart:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const addToCart = async (product: Product, quantity: number = 1): Promise<boolean> => {
        if (!isSignedIn) {
            Toast.show({
                type: "error",
                text1: "Sign in required",
                text2: "Please sign in to add items or buy",
            });
            router.push('/sign-in');
            return false;
        }

        try {
            setIsLoading(true);
            const token = await getToken();
            if (!token) {
                Toast.show({
                    type: "error",
                    text1: "Session expired",
                    text2: "Sign out and sign in again",
                });
                router.push('/sign-in');
                return false;
            }
            const qty = Math.max(1, Number(quantity) || 1);
            const { data } = await api.post('/cart/add', { productId: product._id, quantity: qty }, { headers: { Authorization: `Bearer ${token}` } });

            if (data.success) {
                await fetchCart();
                return true;
            }
            return false;
        } catch (error: any) {
            console.error("Failed to add to cart:", error);
            const status = error?.response?.status;
            const serverMsg = error?.response?.data?.message;
            const text2 =
                status === 401
                    ? "Auth failed — Render Clerk key must be sk_live_. Sign out & sign in again."
                    : serverMsg || error?.message || "Check internet / server";
            Toast.show({
                text1: 'Failed to add to cart',
                text2,
                type: 'error',
            });
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const removeFromCart = async (productId: string) => {
        if (!isSignedIn) return;

        try {
            setIsLoading(true);
            const token = await getToken();
            const { data } = await api.delete(`/cart/item/${productId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });
            if (data.success) {
                await fetchCart();
            }
        } catch (error) {
            console.error("Failed to remove from cart:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateQuantity = async (productId: string, quantity: number) => {
        if (!isSignedIn) return;
        if (quantity < 1) return;

        try {
            setIsLoading(true);
            const token = await getToken();
            const { data } = await api.put(`/cart/item/${productId}`, { quantity }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) {
                await fetchCart();
            }
        } catch (error) {
            console.error("Failed to update quantity:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const clearCart = async () => {
        if (!isSignedIn) return;

        try {
            setIsLoading(true);
            const token = await getToken();
            const { data } = await api.delete('/cart', {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });
            if (data.success) {
                setCartItems([]);
                setCartTotal(0);
            }
        } catch (error) {
            console.error("Failed to clear cart:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    useEffect(() => {
        if (isSignedIn) {
            syncSession().finally(() => fetchCart());
        } else {
            setCartItems([]);
            setCartTotal(0);
        }
    }, [isSignedIn]);

    return (
        <CartContext.Provider
            value={{
                cartItems,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                cartTotal,
                itemCount,
                isLoading
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}

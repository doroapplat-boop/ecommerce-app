import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl, Alert, Modal, TouchableWithoutFeedback, FlatList, Linking, Image } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { COLORS, getStatusColor, formatPrice } from "@/constants";
import { Ionicons } from "@expo/vector-icons";

export default function AdminOrders() {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [orders, setOrders] = useState([]);
    const [statusFilter, setStatusFilter] = useState("all");

    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [updating, setUpdating] = useState(false);
    const [zoomImage, setZoomImage] = useState<string | null>(null);

    const STATUSES = ["placed", "processing", "shipped", "delivered", "cancelled"];
    const FILTERS = ["all", ...STATUSES];

    const fetchOrders = async () => {
        try {
            const token = await getToken();
            const { data } = await api.get('/orders/admin/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) {
                setOrders(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch orders:", error);
            Alert.alert("Error", "Failed to load orders");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    const filteredOrders = useMemo(() => {
        if (statusFilter === "all") return orders;
        return orders.filter((order: any) => order.orderStatus === statusFilter);
    }, [orders, statusFilter]);

    const openStatusModal = (order: any) => {
        setSelectedOrder(order);
        setStatusModalVisible(true);
    };

    const callPhone = (phone?: string) => {
        if (!phone) return;
        const digits = phone.replace(/[^\d+]/g, "");
        Linking.openURL(`tel:${digits}`).catch(() => {
            Alert.alert("Error", "Could not open phone dialer");
        });
    };

    const updateStatus = async (newStatus: string) => {
        if (!selectedOrder) return;

        try {
            setUpdating(true);
            const token = await getToken();
            const { data } = await api.put(`/orders/${selectedOrder._id}/status`,
                { orderStatus: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.success) {
                Alert.alert("Success", "Order status updated");
                setStatusModalVisible(false);
                fetchOrders();
            }
        } catch (error) {
            console.error("Failed to update status:", error);
            Alert.alert("Error", "Failed to update status");
        } finally {
            setUpdating(false);
        }
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-surface">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-surface">
            <View className="px-4 pt-3 pb-2 bg-white border-b border-gray-100">
                <Text className="text-secondary text-xs font-bold mb-2 uppercase">Filter by Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {FILTERS.map((status, index) => {
                        const active = statusFilter === status;
                        return (
                            <TouchableOpacity
                                key={status}
                                onPress={() => setStatusFilter(status)}
                                style={{ marginRight: index === FILTERS.length - 1 ? 0 : 12 }}
                                className={`px-4 py-2 rounded-full border ${active ? "bg-primary border-primary" : "bg-surface border-gray-200"}`}
                            >
                                <Text className={`text-xs font-bold capitalize ${active ? "text-white" : "text-primary"}`}>
                                    {status === "delivered" ? "Finished" : status}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <ScrollView
                className="flex-1 p-4"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {filteredOrders.length === 0 ? (
                    <View className="flex-1 justify-center items-center mt-20">
                        <Text className="text-secondary">No orders found</Text>
                    </View>
                ) : (
                    filteredOrders.map((order: any) => (
                        <View key={order._id} className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100">
                            <View className="flex-row justify-between mb-2">
                                <Text className="font-medium text-sm text-gray-400 ">Order ID : #{order._id}</Text>
                                <Text className="text-secondary text-xs">{new Date(order.createdAt).toLocaleDateString()}</Text>
                            </View>

                            <View className="mb-3 bg-gray-50 p-3 rounded-lg">
                                <Text className="text-xs text-secondary font-bold mb-1">CUSTOMER</Text>
                                <Text className="text-primary font-medium">{order.user?.name || 'Unknown User'}</Text>
                                <Text className="text-secondary text-xs">{order.user?.email || 'No email'}</Text>
                            </View>

                            <View className="mb-3 bg-gray-50 p-3 rounded-lg">
                                <Text className="text-xs text-secondary font-bold mb-1">SHIPPING ADDRESS</Text>
                                <Text className="text-primary text-xs mb-2">
                                    {order.shippingAddress?.city}, {order.shippingAddress?.state}
                                </Text>
                                {!!order.shippingAddress?.phone && (
                                    <TouchableOpacity
                                        onPress={() => callPhone(order.shippingAddress.phone)}
                                        className="flex-row items-center bg-white px-3 py-2 rounded-lg self-start border border-primary/20"
                                    >
                                        <Ionicons name="call-outline" size={16} color={COLORS.primary} />
                                        <Text className="text-primary font-bold text-sm ml-2">
                                            {order.shippingAddress.phone}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View className="mb-3 bg-gray-50 p-3 rounded-lg">
                                <Text className="text-xs text-secondary font-bold mb-1">PAYMENT</Text>
                                <Text className="text-primary font-medium">
                                    {order.paymentMethod === "cash_on_delivery"
                                        ? "Cash on Delivery"
                                        : order.paymentMethodName || order.paymentMethod || "Transfer"}
                                </Text>
                                {order.paymentMethod === "cash_on_delivery" && (
                                    <Text className="text-secondary text-xs mt-1">
                                        Via {order.paymentMethodName || "transfer"} (delivery fee only)
                                    </Text>
                                )}
                                {!!order.payerName && (
                                    <Text className="text-secondary text-xs mt-1">Payer: {order.payerName}</Text>
                                )}
                                {!!order.paymentAccountNumber && (
                                    <Text className="text-secondary text-xs mt-1">Account: {order.paymentAccountNumber}</Text>
                                )}
                                <Text className="text-secondary text-xs mt-1 capitalize">
                                    Status: {order.paymentStatus || "pending"}
                                </Text>
                                {order.paymentMethod === "cash_on_delivery" && (
                                    <>
                                        <Text className="text-secondary text-xs mt-1">
                                            Paid online: {formatPrice(order.amountPaidOnline ?? order.shippingCost ?? 0)}
                                        </Text>
                                        <Text className="text-secondary text-xs mt-1">
                                            Due on delivery: {formatPrice(order.amountDueOnDelivery ?? order.subtotal ?? 0)}
                                        </Text>
                                    </>
                                )}
                                {!!order.paymentScreenshot && (
                                    <View className="mt-2">
                                        <TouchableOpacity onPress={() => setZoomImage(order.paymentScreenshot)} activeOpacity={0.9}>
                                            <Image
                                                source={{ uri: order.paymentScreenshot }}
                                                className="w-full h-40 rounded-lg"
                                                resizeMode="cover"
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setZoomImage(order.paymentScreenshot)}
                                            className="mt-2 bg-primary flex-row items-center justify-center py-2.5 rounded-lg"
                                        >
                                            <Ionicons name="expand-outline" size={16} color="#fff" />
                                            <Text className="text-white font-bold text-sm ml-2">Zoom Screenshot</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <View className="mb-3">
                                <Text className="text-xs text-secondary font-bold mb-2">ITEMS</Text>
                                {order.items.map((item: any) => (
                                    <View key={item._id} className="flex-row justify-between mb-1">
                                        <Text className="text-secondary text-xs flex-1">
                                            {item.quantity}x {item.product?.name || item.name}
                                        </Text>
                                        <Text className="text-secondary text-xs font-bold">
                                            {formatPrice(item.price)}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            <View className="flex-row justify-between items-center mb-1">
                                <Text className="text-secondary text-sm">Subtotal</Text>
                                <Text className="text-secondary text-sm">{formatPrice(order.subtotal)}</Text>
                            </View>
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-secondary text-sm">Delivery</Text>
                                <Text className="text-secondary text-sm">{formatPrice(order.shippingCost || 0)}</Text>
                            </View>
                            <View className="flex-row justify-between items-center mt-2 pt-3 border-t border-gray-100">
                                <Text className="text-primary font-bold text-lg">{formatPrice(order.totalAmount)}</Text>

                                <TouchableOpacity
                                    onPress={() => openStatusModal(order)}
                                    className={`flex-row items-center px-4 py-2 rounded-full ${getStatusColor(order.orderStatus)}`}
                                >
                                    <Text className="text-xs font-bold mr-2 uppercase tracking-wide">
                                        {order.orderStatus === "delivered" ? "finished" : order.orderStatus}
                                    </Text>
                                    <Ionicons name="pencil" size={12} color="black" style={{ opacity: 0.5 }} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <Modal visible={statusModalVisible} animationType="fade" transparent>
                <TouchableWithoutFeedback onPress={() => setStatusModalVisible(false)}>
                    <View className="flex-1 justify-end bg-black/50">
                        <View className="bg-white rounded-t-2xl p-4 max-h-[60%]">
                            <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-gray-100">
                                <Text className="text-lg font-bold text-primary">
                                    Update Order Status
                                </Text>
                                <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.secondary} />
                                </TouchableOpacity>
                            </View>

                            {updating ? (
                                <View className="py-8">
                                    <ActivityIndicator size="large" color={COLORS.primary} />
                                    <Text className="text-center text-secondary mt-2">Updating status...</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={STATUSES}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            className={`p-4 rounded-xl mb-2 flex-row justify-between items-center ${selectedOrder?.orderStatus === item ? "bg-primary/10" : "bg-gray-50"
                                                }`}
                                            onPress={() => updateStatus(item)}
                                        >
                                            <Text className={`font-medium capitalize ${selectedOrder?.orderStatus === item ? "text-primary font-bold" : "text-secondary"
                                                }`}>
                                                {item === "delivered" ? "Finished" : item}
                                            </Text>
                                            {selectedOrder?.orderStatus === item && (
                                                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                />
                            )}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <Modal visible={!!zoomImage} transparent animationType="fade" onRequestClose={() => setZoomImage(null)}>
                <View className="flex-1 bg-black">
                    <TouchableOpacity
                        onPress={() => setZoomImage(null)}
                        className="absolute top-12 right-4 z-20 w-10 h-10 bg-white/20 rounded-full items-center justify-center"
                    >
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => setZoomImage(null)}
                        className="flex-1 items-center justify-center px-2"
                    >
                        {!!zoomImage && (
                            <Image
                                source={{ uri: zoomImage }}
                                style={{ width: "100%", height: "80%" }}
                                resizeMode="contain"
                            />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setZoomImage(null)}
                        className="mx-6 mb-10 bg-white py-3 rounded-xl items-center"
                    >
                        <Text className="text-primary font-bold">Close</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}

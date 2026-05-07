import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, extractArray } from '../services/api';

const formatPrice = (v?: number | string | null) => {
  if (v == null || v === '') return 'P0.00';
  const n = Number(v);
  return Number.isNaN(n) ? `P${v}` : `P${n.toFixed(2)}`;
};

// ─── Shimmer ──────────────────────────────────────────────────────────────────
function ShimmerBox({ height, width, borderRadius = 12, style }: { height: number; width?: number | string; borderRadius?: number; style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] });
  return (
    <Animated.View
      style={[{ width: width ?? '100%', height, borderRadius, backgroundColor: '#DDD6FE', opacity }, style]}
    />
  );
}

function OrderSkeleton() {
  return (
    <View className="mb-4 rounded-2xl border border-violet-50 bg-white p-4">
      <View className="flex-row justify-between mb-2">
        <ShimmerBox height={16} width="40%" />
        <ShimmerBox height={16} width="20%" />
      </View>
      <ShimmerBox height={12} width="60%" style={{ marginBottom: 12 }} />
      <View className="rounded-xl bg-violet-50 p-3 mb-3">
        <ShimmerBox height={10} width="80%" style={{ marginBottom: 8 }} />
        <ShimmerBox height={10} width="60%" />
      </View>
      <View className="flex-row justify-between pt-2 border-t border-violet-50">
        <ShimmerBox height={12} width="40%" />
        <ShimmerBox height={16} width="25%" borderRadius={20} />
      </View>
    </View>
  );
}

export default function OrderHistoryScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch both orders and addresses in parallel
      const [orderRes, addrRes] = await Promise.all([
        api.getMyOrders(),
        api.getAddresses().catch(() => ({ success: false, data: [] }))
      ]);
      
      // Create a map for easy lookup: { 'uuid': 'Street, City' }
      const addrMap: Record<string, string> = {};
      extractArray(addrRes).forEach((a: any) => {
        addrMap[a.id] = `${a.street_address}, ${a.city}`;
      });
      setAddresses(addrMap);
      
      setOrders(extractArray(orderRes));
    } catch (err) {
      console.error('Failed to load history data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row items-center border-b border-gray-100 px-4 py-4">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-50">
          <FontAwesome name="arrow-left" size={20} color="#9CA3AF" />
        </Pressable>
        <Text className="ml-4 font-inter-bold text-lg text-violet-900">Order History</Text>
      </View>
      
      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {isLoading ? (
          [0, 1, 2, 3].map((i) => <OrderSkeleton key={i} />)
        ) : orders.length === 0 ? (
          <View className="mt-20 items-center justify-center px-6">
            <FontAwesome name="list-alt" size={48} color="#DDD6FE" />
            <Text className="mt-4 font-inter-bold text-lg text-violet-900">No orders yet</Text>
            <Text className="mt-2 text-center font-inter-light text-sm text-violet-500">
              When you place your first order, it will appear here.
            </Text>
          </View>
        ) : (
          orders.map((o, idx) => (
            <View key={o.id || idx} className="mb-4 rounded-3xl border border-violet-100 bg-white p-4 shadow-sm shadow-violet-100/30">
              <View className="mb-2 flex-row justify-between items-start">
                <View>
                  <Text className="font-inter-bold text-base text-violet-900">Order #{String(o.id || '').slice(0, 8).toUpperCase()}</Text>
                  <Text className="mt-0.5 font-inter-light text-xs text-violet-400">
                    {o.created_at ? new Date(o.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-inter-extrabold text-base text-violet-700">{formatPrice(o.total_amount || o.total)}</Text>
                  <View className="mt-1 flex-row items-center">
                    <FontAwesome name={o.payment_method === 'cash' ? 'money' : 'credit-card'} size={10} color="#9CA3AF" />
                    <Text className="ml-1 font-inter-light text-[10px] text-gray-400 uppercase">{o.payment_method || 'Payment'}</Text>
                  </View>
                </View>
              </View>

              <View className="my-3 rounded-2xl bg-violet-50/50 border border-violet-50 p-3">
                {o.items && o.items.length > 0 ? (
                  o.items.map((item: any, i: number) => (
                    <Text key={i} className="font-inter text-sm text-violet-800">
                      <Text className="font-inter-bold">{item.quantity} ×</Text> {item.menu_item?.name || item.name || 'Food Item'}
                    </Text>
                  ))
                ) : (
                  <Text className="font-inter-light text-xs text-violet-400">View items in order details</Text>
                )}
              </View>

              <View className="flex-row items-center justify-between border-t border-violet-50 pt-3">
                <View className="flex-1 pr-4">
                  <Text className="font-inter-light text-[11px] text-gray-500" numberOfLines={1}>
                    <FontAwesome name="map-marker" size={10} color="#D1D5DB" /> {addresses[o.delivery_address_id] || o.street_address || o.address || 'Standard Delivery'}
                  </Text>
                </View>
                <View className={`rounded-full px-3 py-1 ${o.status === 'delivered' ? 'bg-green-100' : 'bg-violet-100'}`}>
                  <Text className={`font-inter-extrabold text-[10px] uppercase ${o.status === 'delivered' ? 'text-green-700' : 'text-violet-700'}`}>
                    {(o.status || 'pending').replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

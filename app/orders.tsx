import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const formatPrice = (v?: number | string | null) => {
  if (v == null || v === '') return 'P0.00';
  const n = Number(v);
  return Number.isNaN(n) ? `P${v}` : `P${n.toFixed(2)}`;
};

export default function OrderHistoryScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const loadOrders = async () => {
      const stored = await AsyncStorage.getItem('user_orders');
      if (stored) setOrders(JSON.parse(stored));
    };
    loadOrders();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center border-b border-gray-100 px-4 py-4">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-50">
          <FontAwesome name="arrow-left" size={20} color="#9CA3AF" />
        </Pressable>
        <Text className="ml-4 font-inter-bold text-lg text-violet-900">Order History</Text>
      </View>
      
      {orders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <FontAwesome name="list-alt" size={48} color="#DDD6FE" />
          <Text className="mt-4 font-inter-bold text-lg text-violet-900">No orders yet</Text>
          <Text className="mt-2 text-center font-inter-light text-sm text-violet-500">
            When you place your first order, it will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-4">
          {orders.map((o, idx) => (
            <View key={idx} className="mb-4 rounded-2xl border border-violet-100 bg-white p-4">
              <View className="mb-2 flex-row justify-between">
                <Text className="font-inter-bold text-base text-violet-900">Order #{o.id}</Text>
                <Text className="font-inter-bold text-base text-violet-600">{formatPrice(o.total)}</Text>
              </View>
              <Text className="mb-3 font-inter-light text-xs text-gray-500">{new Date(o.date).toLocaleString()}</Text>
              <View className="mb-3 rounded-lg bg-gray-50 p-3">
                {o.items?.map((item: any, i: number) => (
                  <Text key={i} className="font-inter text-sm text-gray-700">
                    {item.quantity} × {item.name}
                  </Text>
                ))}
              </View>
              <View className="flex-row items-center justify-between border-t border-gray-100 pt-3">
                <Text className="font-inter-light text-xs text-gray-500">Delivery to: {o.address}</Text>
                <View className="rounded-full bg-green-100 px-2 py-1">
                  <Text className="font-inter-bold text-[10px] uppercase text-green-700">{o.status || 'delivered'}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

import { FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiCartItem, extractArray } from '../services/api';

const formatPrice = (v?: number | string | null) => {
  if (v == null || v === '') return 'P0.00';
  const n = Number(v);
  return Number.isNaN(n) ? `P${v}` : `P${n.toFixed(2)}`;
};

// ─── Shimmer ──────────────────────────────────────────────────────────────────
function ShimmerRow() {
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
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.75] });
  return (
    <View className="mb-3 flex-row items-center rounded-2xl border border-violet-100 bg-white p-3">
      <Animated.View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#DDD6FE', opacity }} />
      <View className="ml-3 flex-1">
        <Animated.View style={{ height: 13, width: '70%', borderRadius: 6, backgroundColor: '#DDD6FE', opacity }} />
        <Animated.View style={{ height: 11, width: '40%', borderRadius: 6, backgroundColor: '#DDD6FE', opacity, marginTop: 8 }} />
      </View>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ApiCartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadCart = async () => {
    setIsLoading(true);
    try {
      const result = await api.getCart();
      setItems(extractArray(result));
      setIsLoggedIn(true);
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.toLowerCase().includes('unauthorized')) {
        setIsLoggedIn(false);
      }
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handleUpdateQuantity = async (item: ApiCartItem, newQty: number) => {
    if (newQty < 1) {
      handleRemoveItem(item);
      return;
    }
    const targetId = item.menu_item_id || item.id;
    setUpdatingId(targetId);
    try {
      await api.updateCartItem(targetId, newQty);
      // Optimistic update
      setItems((prev) => prev.map((it) => (it.id === item.id) ? { ...it, quantity: newQty } : it));
    } catch (err) {
      console.error(err);
      loadCart(); // Refresh on error
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveItem = async (item: ApiCartItem) => {
    const targetId = item.menu_item_id || item.id;
    setUpdatingId(targetId);
    try {
      await api.removeFromCart(targetId);
      setItems((prev) => prev.filter((it) => it.id !== item.id));
    } catch (err) {
      console.error(err);
      loadCart();
    } finally {
      setUpdatingId(null);
    }
  };

  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.menu_item?.price ?? 0);
    return sum + price * item.quantity;
  }, 0);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-50">
          <FontAwesome name="arrow-left" size={20} color="#9CA3AF" />
        </Pressable>
        <Text className="font-inter-bold text-lg text-violet-900">Your Cart</Text>
        <View className="w-10" />
      </View>

      {/* Body */}
      <ScrollView className="flex-1 px-4 pt-2" contentContainerStyle={{ paddingBottom: 160 }}>

        {/* Loading */}
        {isLoading && [0, 1, 2].map((i) => <ShimmerRow key={i} />)}

        {/* Not logged in */}
        {!isLoading && !isLoggedIn && (
          <View className="mt-16 items-center">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-violet-50 mb-4">
              <FontAwesome name="lock" size={32} color="#7C3AED" />
            </View>
            <Text className="font-inter-bold text-lg text-violet-900">Sign in required</Text>
            <Text className="mt-2 text-center font-inter-light text-sm text-violet-500 px-8">
              Log in to see the items you've added to your cart and proceed to checkout.
            </Text>
            <Pressable
              onPress={() => router.push('/auth')}
              className="mt-8 h-14 w-full items-center justify-center rounded-2xl bg-violet-600">
              <Text className="font-inter-bold text-base text-white">Sign In</Text>
            </Pressable>
          </View>
        )}

        {/* Empty cart */}
        {!isLoading && isLoggedIn && items.length === 0 && (
          <View className="mt-20 items-center">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-violet-50 mb-6">
              <FontAwesome name="shopping-basket" size={40} color="#DDD6FE" />
            </View>
            <Text className="font-inter-bold text-xl text-violet-900">Your cart is empty</Text>
            <Text className="mt-2 text-center font-inter-light text-sm text-violet-500">
              Add some delicious items from our restaurants!
            </Text>
            <Pressable
              onPress={() => router.replace('/(tabs)/home')}
              className="mt-8 h-14 w-full items-center justify-center rounded-2xl bg-violet-600">
              <Text className="font-inter-bold text-base text-white">Explore Food</Text>
            </Pressable>
          </View>
        )}

        {/* Cart items */}
        {!isLoading && isLoggedIn && items.map((item) => (
          <View key={item.id} className="mb-4 flex-row items-center rounded-3xl border border-violet-100 bg-white p-4 shadow-sm shadow-violet-100/50">
            <View className="h-20 w-20 rounded-2xl bg-violet-50 items-center justify-center overflow-hidden">
              {item.menu_item?.image_url ? (
                <Image source={{ uri: item.menu_item.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <FontAwesome name="cutlery" size={24} color="#A78BFA" />
              )}
            </View>
            
            <View className="ml-4 flex-1">
              <Text className="font-inter-bold text-base text-violet-900" numberOfLines={1}>
                {item.menu_item?.name ?? 'Menu item'}
              </Text>
              <Text className="mt-1 font-inter-bold text-sm text-violet-600">
                {formatPrice(item.menu_item?.price)}
              </Text>
              
              <View className="mt-3 flex-row items-center justify-between">
                {/* Quantity control */}
                <View className="flex-row items-center rounded-full bg-violet-50 p-1">
                  <Pressable 
                    onPress={() => handleUpdateQuantity(item, item.quantity - 1)}
                    disabled={updatingId === item.id || updatingId === item.menu_item_id}
                    className="h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                    <FontAwesome name="minus" size={12} color="#7C3AED" />
                  </Pressable>
                  <Text className="mx-4 font-inter-bold text-sm text-violet-900">{item.quantity}</Text>
                  <Pressable 
                    onPress={() => handleUpdateQuantity(item, item.quantity + 1)}
                    disabled={updatingId === item.id || updatingId === item.menu_item_id}
                    className="h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                    <FontAwesome name="plus" size={12} color="#7C3AED" />
                  </Pressable>
                </View>

                {/* Remove button */}
                <Pressable 
                  onPress={() => handleRemoveItem(item)}
                  disabled={updatingId === item.id || updatingId === item.menu_item_id}
                  className="h-9 w-9 items-center justify-center rounded-full bg-red-50">
                  <FontAwesome name="trash-o" size={16} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          </View>
        ))}

      </ScrollView>

      {/* Checkout footer */}
      {!isLoading && isLoggedIn && items.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 border-t border-violet-100 bg-white px-6 pb-10 pt-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-inter text-base text-violet-700">Total Amount</Text>
            <Text className="font-inter-extrabold text-2xl text-violet-900">{formatPrice(subtotal)}</Text>
          </View>
          <Pressable 
            onPress={() => router.push('/checkout')}
            className="h-14 items-center justify-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-600/40">
            <Text className="font-inter-bold text-lg text-white">
              Checkout Now
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

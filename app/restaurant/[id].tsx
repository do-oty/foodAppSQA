import { FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Animated, Pressable, ScrollView, Text, View, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiRestaurant, ApiMenuItem, ApiFavorite, extractArray } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function RestaurantDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  
  const [restaurant, setRestaurant] = useState<ApiRestaurant | null>(null);
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cartToast, setCartToast] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg: string) => {
    setCartToast(msg);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 1, useNativeDriver: false, speed: 20 }),
      Animated.delay(1600),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start();
  };

  // Favorites API disabled (no endpoint)
  const fetchFavorites = useCallback(async () => {
    return; // TODO: re-enable when /favorites endpoint is available
  }, [isAuthenticated]);

  useEffect(() => {
    const resId = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!resId) return;

    const load = async () => {
      try {
        const [res, menuRes] = await Promise.all([
          api.getRestaurant(resId),
          api.getMenu(resId)
        ]);
        setRestaurant(res.data);
        const menuItemsList = extractArray<ApiMenuItem>(menuRes);
        setMenuItems(menuItemsList);
        
        const q: Record<string, number> = {};
        menuItemsList.forEach((item) => {
          q[item.id] = 1;
        });
        setQuantities(q);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
    fetchFavorites();
  }, [params.id, fetchFavorites]);

  const toggleFavorite = async (restaurantId?: string, menuItemId?: string) => {
    console.log('toggleFavorite called with:', { restaurantId, menuItemId });
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please log in to save your favorite restaurants and dishes.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log In', onPress: () => router.push('/auth') }
      ]);
      return;
    }
    const id = (restaurantId || menuItemId)!;
    const isFav = favorites.has(id);
    
    setFavorites(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(id);
      else next.add(id);
      return next;
    });

    try {
      if (isFav) {
        // TODO: removeFavorite when endpoint available
      } else {
        const data = { 
          restaurant_id: restaurantId || null, 
          menu_item_id: menuItemId || null 
        };
        console.log('Adding favorite (no-op — endpoint disabled):', data);
      }
    } catch (err: any) {
      console.error('Favorite toggle failed:', err);
      Alert.alert('Error', err?.message || 'Failed to update favorites. Please try again.');
      fetchFavorites();
    }
  };

  const updateItemQty = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const handleAddToCart = async (item: ApiMenuItem) => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please log in to add items to your cart.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log In', onPress: () => router.push('/auth') }
      ]);
      return;
    }
    
    setAddingToCart(item.id);
    try {
      const qty = quantities[item.id] || 1;
      await api.addToCart({
        restaurant_id: params.id!,
        menu_item_id: item.id,
        quantity: qty,
        menu_item: item,
      });
      showToast(`${qty}× ${item.name} added!`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not add to cart.');
    } finally {
      setAddingToCart(null);
    }
  };

  const formatPrice = (p?: string | number | null) => {
    if (p == null) return 'N/A';
    const n = Number(p);
    return Number.isNaN(n) ? `P${p}` : `P${n.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="font-inter-bold text-xl text-violet-900 text-center">Restaurant not found.</Text>
        <Pressable onPress={() => router.back()} className="mt-6 rounded-2xl bg-violet-600 px-8 py-4 shadow-lg shadow-violet-600/30">
          <Text className="font-inter-bold text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Back button overlay */}
      <SafeAreaView className="absolute z-10 w-full flex-row items-center justify-between px-10 pt-10">
        <Pressable 
          onPress={() => router.back()} 
          className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-xl shadow-black/10">
          <FontAwesome name="arrow-left" size={22} color="#7C3AED" />
        </Pressable>
        <Pressable 
          onPress={() => toggleFavorite(params.id)}
          className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-xl shadow-black/10">
          <FontAwesome name={favorites.has(params.id!) ? 'heart' : 'heart-o'} size={22} color={favorites.has(params.id!) ? '#EF4444' : '#7C3AED'} />
        </Pressable>
      </SafeAreaView>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Cover Image */}
        {restaurant.cover_image_url || restaurant.logo_url ? (
          <Image 
            source={{ uri: restaurant.cover_image_url ?? restaurant.logo_url ?? undefined }} 
            style={{ width: '100%', height: 260 }} 
            contentFit="cover" 
          />
        ) : (
          <View className="h-[260px] w-full bg-violet-100 items-center justify-center">
            <FontAwesome name="image" size={64} color="#DDD6FE" />
          </View>
        )}

        {/* Restaurant Info */}
        <View className="px-6 pt-6 pb-8 border-b border-violet-50">
          <Text className="font-inter-extrabold text-3xl text-violet-900">{restaurant.name}</Text>
          <Text className="mt-2 font-inter-light text-base text-violet-500">
            {restaurant.cuisine_type?.join(', ') || 'Various Cuisines'}
          </Text>
          {restaurant.description && (
            <Text className="mt-4 font-inter-light text-sm leading-6 text-violet-600">{restaurant.description}</Text>
          )}

          <View className="mt-6 flex-row items-center gap-4">
            <View className="flex-row items-center rounded-2xl bg-yellow-50 px-4 py-2 border border-yellow-100">
              <FontAwesome name="star" size={14} color="#EAB308" />
              <Text className="ml-2 font-inter-bold text-sm text-yellow-700">
                {restaurant.average_rating?.toFixed(1) ?? 'New'}
              </Text>
            </View>
            <View className="flex-row items-center rounded-2xl bg-violet-50 px-4 py-2 border border-violet-100">
              <FontAwesome name="motorcycle" size={14} color="#7C3AED" />
              <Text className="ml-2 font-inter-bold text-sm text-violet-700">
                {formatPrice(restaurant.delivery_fee)}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View className="px-6 pt-8">
          <Text className="mb-6 font-inter-bold text-2xl text-violet-900">Menu</Text>
          
          {menuItems.length === 0 ? (
            <View className="py-12 items-center">
              <FontAwesome name="cutlery" size={48} color="#F3F4F6" />
              <Text className="mt-4 font-inter-light text-violet-400">No menu items available.</Text>
            </View>
          ) : (
            menuItems.map((item) => (
              <View key={item.id} className="mb-5 flex-row rounded-3xl border border-violet-50 bg-white p-4 shadow-sm shadow-violet-100/30">
                <View className="flex-1 pr-4">
                  <Text className="font-inter-bold text-lg text-violet-900">{item.name}</Text>
                  {item.description && (
                    <Text className="mt-1 font-inter-light text-xs text-violet-500" numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  <Text className="mt-3 font-inter-extrabold text-base text-violet-700">{formatPrice(item.price)}</Text>
                </View>
                
                <View className="items-end justify-between">
                  {item.image_url ? (
                    <View className="relative">
                      <Image source={{ uri: item.image_url }} style={{ width: 90, height: 90, borderRadius: 20 }} contentFit="cover" />
                      <Pressable 
                        onPress={() => toggleFavorite(undefined, item.id)}
                        className="absolute right-1.5 top-1.5 h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg shadow-black/10">
                        <FontAwesome name={favorites.has(item.id) ? 'heart' : 'heart-o'} size={14} color={favorites.has(item.id) ? '#EF4444' : '#7C3AED'} />
                      </Pressable>
                    </View>
                  ) : (
                    <View className="relative">
                      <View className="h-[90px] w-[90px] rounded-[20px] bg-violet-50 items-center justify-center">
                        <FontAwesome name="cutlery" size={28} color="#DDD6FE" />
                      </View>
                      <Pressable 
                        onPress={() => toggleFavorite(undefined, item.id)}
                        className="absolute right-1.5 top-1.5 h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg shadow-black/10">
                        <FontAwesome name={favorites.has(item.id) ? 'heart' : 'heart-o'} size={14} color={favorites.has(item.id) ? '#EF4444' : '#7C3AED'} />
                      </Pressable>
                    </View>
                  )}
                  
                  <View className="mt-3 flex-row items-center gap-3">
                    <View className="flex-row items-center rounded-full bg-violet-50 p-1.5 border border-violet-100">
                      <Pressable 
                        onPress={() => updateItemQty(item.id, -1)}
                        className="h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
                        <FontAwesome name="minus" size={10} color="#7C3AED" />
                      </Pressable>
                      <Text className="mx-3 font-inter-bold text-sm text-violet-900">{quantities[item.id] || 1}</Text>
                      <Pressable 
                        onPress={() => updateItemQty(item.id, 1)}
                        className="h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
                        <FontAwesome name="plus" size={10} color="#7C3AED" />
                      </Pressable>
                    </View>

                    <Pressable 
                      onPress={() => handleAddToCart(item)}
                      disabled={addingToCart === item.id}
                      className="h-10 items-center justify-center rounded-full bg-violet-600 px-5 shadow-lg shadow-violet-600/20">
                      {addingToCart === item.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text className="font-inter-bold text-xs text-white">Add</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating View Cart Button */}
      {isAuthenticated && (
        <SafeAreaView edges={['bottom']} className="absolute bottom-12 w-full items-center" style={{ zIndex: 999 }}>
          <Pressable 
            onPress={() => router.push('/cart')}
            style={{ width: Dimensions.get('window').width * 0.85, elevation: 10 }}
            className="h-14 flex-row items-center justify-center rounded-3xl bg-violet-600 shadow-2xl shadow-violet-900/40">
            <FontAwesome name="shopping-basket" size={18} color="white" />
            <Text className="ml-3 font-inter-bold text-lg text-white">View Cart</Text>
          </Pressable>
        </SafeAreaView>
      )}

      {/* Cart Toast */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            bottom: 100,
            alignSelf: 'center',
            backgroundColor: '#4C1D95',
            borderRadius: 24,
            paddingHorizontal: 20,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#4C1D95',
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 10,
          },
          {
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}>
        <FontAwesome name="check-circle" size={16} color="#A78BFA" />
        <Text style={{ color: 'white', fontWeight: '700', marginLeft: 8, fontSize: 14 }}>{cartToast}</Text>
      </Animated.View>
    </View>
  );
}

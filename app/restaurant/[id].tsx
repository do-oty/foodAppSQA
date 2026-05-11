import { FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Animated, Pressable, ScrollView, Text, View, ActivityIndicator, Alert, Dimensions, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiRestaurant, ApiMenuItem, ApiFavorite, ApiReview, extractArray } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../components/ui/custom-alert';

export default function RestaurantDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { showAlert } = useAlert();
  
  const [restaurant, setRestaurant] = useState<ApiRestaurant | null>(null);
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, any[]>>({});
  const [showReviews, setShowReviews] = useState(true);
  const marqueeAnim = useRef(new Animated.Value(0)).current;
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
        const [res, menuRes, reviewsRes, ordersRes] = await Promise.all([
          api.getRestaurant(resId),
          api.getMenu(resId),
          api.getReviews(resId),
          api.getMyOrders().catch(() => ({ success: true, data: [] }))
        ]);
        setRestaurant(res.data);
        const menuItemsList = extractArray<ApiMenuItem>(menuRes);
        setMenuItems(menuItemsList);
        setReviews(extractArray<ApiReview>(reviewsRes));
        
        const oMap: Record<string, any[]> = {};
        extractArray(ordersRes).forEach((o: any) => {
          oMap[o.id] = [...(o.items || []), ...(o.order_items || [])];
        });
        setOrderItemsMap(oMap);
        
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

  useEffect(() => {
    if (!showReviews || reviews.length === 0) return;
    
    const totalWidth = reviews.length * 292; // 280 width + 12 gap
    
    marqueeAnim.setValue(0); // Reset to start
    
    const animation = Animated.loop(
      Animated.timing(marqueeAnim, {
        toValue: -totalWidth,
        duration: reviews.length * 5000, // 5 seconds per item (slower)
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { iterations: -1 }
    );
    
    animation.start();
    
    return () => animation.stop();
  }, [showReviews, reviews]);

  const toggleFavorite = async (restaurantId?: string, menuItemId?: string) => {
    console.log('toggleFavorite called with:', { restaurantId, menuItemId });
    if (!isAuthenticated) {
      showAlert({
        title: 'Login Required',
        message: 'Please log in to save your favorite restaurants and dishes.',
        type: 'info',
        showCancel: true,
        confirmText: 'Log In',
        onConfirm: () => router.push('/auth'),
      });
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
      showAlert({
        title: 'Error',
        message: err?.message || 'Failed to update favorites. Please try again.',
        type: 'error'
      });
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
      showAlert({
        title: 'Login Required',
        message: 'Please log in to add items to your cart.',
        type: 'info',
        showCancel: true,
        confirmText: 'Log In',
        onConfirm: () => router.push('/auth'),
      });
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
      showAlert({
        title: 'Error',
        message: err?.message || 'Could not add to cart.',
        type: 'error'
      });
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

  const calculatedRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

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
            {(restaurant.average_rating || calculatedRating) && (
              <View className="flex-row items-center rounded-2xl bg-yellow-50 px-4 py-2 border border-yellow-100">
                <FontAwesome name="star" size={14} color="#EAB308" />
                <Text className="ml-2 font-inter-bold text-sm text-yellow-700">
                  {restaurant.average_rating ? restaurant.average_rating.toFixed(1) : calculatedRating}
                </Text>
              </View>
            )}
            <View className="flex-row items-center rounded-2xl bg-violet-50 px-4 py-2 border border-violet-100">
              <FontAwesome name="motorcycle" size={14} color="#7C3AED" />
              <Text className="ml-2 font-inter-bold text-sm text-violet-700">
                {formatPrice(restaurant.delivery_fee)}
              </Text>
            </View>
          </View>
        </View>

        {/* Reviews Carousel */}
        <View className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Text className="font-inter-bold text-xl text-violet-900">Reviews</Text>
              <View className="rounded-full bg-violet-100 px-2 py-0.5">
                <Text className="font-inter-bold text-[10px] text-violet-700">{reviews.length}</Text>
              </View>
            </View>
            <Pressable onPress={() => setShowReviews(!showReviews)} className="flex-row items-center gap-1">
              <Text className="font-inter-bold text-xs text-violet-600">
                {showReviews ? 'Hide' : 'Show'}
              </Text>
              <FontAwesome name={showReviews ? 'angle-up' : 'angle-down'} size={14} color="#7C3AED" />
            </Pressable>
          </View>

          {showReviews && (
            reviews.length === 0 ? (
              <View className="py-6 items-center bg-violet-50/50 rounded-2xl border border-violet-50">
                <FontAwesome name="comment-o" size={24} color="#A78BFA" />
                <Text className="mt-2 font-inter-light text-xs text-violet-400">No reviews yet.</Text>
              </View>
            ) : (
              <View style={{ overflow: 'hidden' }} className="pb-2">
                <Animated.View 
                  style={{ 
                    flexDirection: 'row', 
                    gap: 12, 
                    transform: [{ translateX: marqueeAnim }] 
                  }}
                >
                  {[...reviews, ...reviews, ...reviews].map((review, index) => (
                    <View key={`${review.id}-${index}`} style={{ width: 280 }} className="p-4 rounded-2xl border border-violet-50 bg-white shadow-sm shadow-violet-100/30">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <View className="h-8 w-8 items-center justify-center rounded-full bg-violet-100">
                            <Text className="font-inter-bold text-xs text-violet-700">
                              {review.user?.full_name?.[0]?.toUpperCase() || '?'}
                            </Text>
                          </View>
                          <View className="ml-3">
                            <Text className="font-inter-bold text-sm text-violet-900">{review.user?.full_name || 'Anonymous'}</Text>
                            <Text className="font-inter-light text-[10px] text-violet-400">
                              {new Date(review.created_at).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row items-center rounded-full bg-yellow-50 px-3 py-1 border border-yellow-100">
                          <FontAwesome name="star" size={10} color="#EAB308" />
                          <Text className="ml-1 font-inter-bold text-xs text-yellow-700">{review.rating}</Text>
                        </View>
                      </View>

                      {/* Ordered Items */}
                      {review.order_id && orderItemsMap[review.order_id] && orderItemsMap[review.order_id].length > 0 && (
                        <View className="mt-2 flex-row flex-wrap gap-1">
                          {orderItemsMap[review.order_id].map((item: any, i: number) => (
                            <View key={i} className="rounded-full bg-violet-50 px-2 py-0.5 border border-violet-100">
                              <Text className="font-inter-bold text-[10px] text-violet-700">
                                {item.quantity}× {item.menu_item?.name || item.name || 'Item'}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <Text className="mt-3 font-inter-light text-sm text-violet-600" numberOfLines={2}>{review.comment}</Text>
                    </View>
                  ))}
                </Animated.View>
              </View>
            )
          )}
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
            bottom: 200,
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

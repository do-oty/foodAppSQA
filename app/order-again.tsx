import { FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiRestaurant, extractArray } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type FeedItem = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  category_name?: string | null;
  restaurant_name?: string | null;
  restaurant_rating?: number | null;
  delivery_fee?: number | null;
};

const PAGE_SIZE = 6;

// ─── Shimmer ──────────────────────────────────────────────────────────────────
function ShimmerBox({ height, borderRadius = 12 }: { height: number; borderRadius?: number }) {
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
    <Animated.View style={{ width: '100%', height, borderRadius, backgroundColor: '#DDD6FE', opacity }} />
  );
}

function CardSkeleton() {
  return (
    <View className="mb-3 rounded-3xl border border-violet-100 bg-white p-3">
      <ShimmerBox height={180} borderRadius={16} />
      <View style={{ marginTop: 12 }}><ShimmerBox height={14} borderRadius={8} /></View>
      <View style={{ marginTop: 8, width: '60%' }}><ShimmerBox height={11} borderRadius={8} /></View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        <View style={{ width: '30%' }}><ShimmerBox height={11} borderRadius={8} /></View>
        <View style={{ width: '25%' }}><ShimmerBox height={11} borderRadius={8} /></View>
      </View>
    </View>
  );
}

const formatPrice = (price?: number | string | null) => {
  if (price == null || price === '') return 'Price N/A';
  const n = Number(price);
  return Number.isNaN(n) ? `P${price}` : `P${n.toFixed(2)}`;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OrderAgainScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = params.mode ?? 'top-rated'; // 'top-rated' | 'discover'

  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const title = mode === 'discover' ? 'Discover More' : mode === 'top-rated' ? 'Recommended' : 'Order Again';
  const subtitle =
    mode === 'discover' ? 'Exciting new flavors to try' : 'Top picks based on your activity';

  // ── Fetch a page of restaurants → flatten menu items ─────────────────────
  const fetchPage = async (pageNum: number, reset = false) => {
    try {
      if (reset) setIsLoading(true);
      else setIsLoadingMore(true);

      const result = await api.getRestaurants({ page: pageNum, limit: 6 });
      const restaurants: ApiRestaurant[] = extractArray(result);

      if (restaurants.length === 0) {
        setHasMore(false);
        return;
      }

      const menuRequests = restaurants.map((r) =>
        api
          .getMenu(r.id, { available: true })
          .then((menuResult) =>
            extractArray(menuResult).map((item: any) => ({
              id: item?.id ?? `${r.id}-${Math.random().toString(36)}`,
              name: item?.name ?? 'Menu item',
              description: item?.description ?? null,
              price: item?.price ?? null,
              image_url: item?.image_url ?? r.cover_image_url ?? r.logo_url ?? null,
              category_name: item?.category_name ?? null,
              restaurant_name: r.name,
              restaurant_rating: typeof r.average_rating === 'number' ? r.average_rating : null,
              delivery_fee: typeof r.delivery_fee === 'number' ? r.delivery_fee : null,
            }))
          )
          .catch(() => [] as FeedItem[])
      );

      let flat = (await Promise.all(menuRequests)).flat();

      // Sort differently per mode
      if (mode === 'discover') {
        flat = flat.sort((a: FeedItem, b: FeedItem) => (a.delivery_fee ?? 999) - (b.delivery_fee ?? 999));
      } else {
        flat = flat.sort((a: FeedItem, b: FeedItem) => (b.restaurant_rating ?? 0) - (a.restaurant_rating ?? 0));
      }

      if (flat.length < PAGE_SIZE) setHasMore(false);

      setItems((prev) => (reset ? flat : [...prev, ...flat]));
    } catch {
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1, true);
  }, [mode]);

  const handleScroll = ({ nativeEvent }: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    const nearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 300;
    if (!nearBottom || isLoadingMore || !hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={isLoading && items.length > 0} onRefresh={() => fetchPage(1, true)} tintColor="#7C3AED" />}>

        <View className="mb-4 mt-2 flex-row items-center">
          <Pressable onPress={() => router.back()} className="h-12 w-12 items-center justify-center rounded-full bg-violet-50">
            <FontAwesome name="arrow-left" size={20} color="#7C3AED" />
          </Pressable>
        </View>

        <Text className="font-inter-extrabold text-3xl text-violet-900">{title}</Text>
        <Text className="mb-6 font-inter-light text-sm text-violet-500">{subtitle}</Text>

        {/* Loading initial */}
        {isLoading && [0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}

        {/* Feed items */}
        {!isLoading &&
          items.map((item) => (
            <View key={item.id} className="mb-3 rounded-3xl border border-violet-200 bg-white p-3">
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  contentFit="cover"
                  style={{ height: 180, width: '100%', borderRadius: 16 }}
                />
              ) : (
                <View className="h-[180px] rounded-2xl bg-violet-100" />
              )}

              <Text className="mt-3 font-inter-bold text-base text-violet-900">{item.name}</Text>
              {!!item.restaurant_name && (
                <Text className="mt-0.5 font-inter text-xs text-violet-500">{item.restaurant_name}</Text>
              )}
              {!!item.description && (
                <Text numberOfLines={2} className="mt-1 font-inter-light text-sm text-violet-400">
                  {item.description}
                </Text>
              )}

              <View className="mt-2 flex-row items-center justify-between">
                <Text className="font-inter-bold text-sm text-violet-700">{formatPrice(item.price)}</Text>
                {!!item.category_name && (
                  <Text className="rounded-full bg-violet-100 px-2 py-1 font-inter text-[11px] text-violet-700">
                    {item.category_name}
                  </Text>
                )}
              </View>

              <View className="mt-1.5 flex-row items-center justify-between">
                <Text className="font-inter-light text-xs text-violet-500">
                  <FontAwesome name="star" size={11} color="#FFD700" />{' '}
                  {item.restaurant_rating?.toFixed(1) ?? 'N/A'}
                </Text>
                <Text className="font-inter-light text-xs text-violet-500">
                  Delivery {item.delivery_fee != null ? `P${item.delivery_fee}` : 'N/A'}
                </Text>
              </View>
            </View>
          ))}

        {/* Loading more */}
        {isLoadingMore && [0, 1].map((i) => <CardSkeleton key={`more-${i}`} />)}

        {/* End of list */}
        {!isLoading && !hasMore && items.length > 0 && (
          <Text className="mb-4 text-center font-inter-light text-xs text-violet-400">
            You've seen all items
          </Text>
        )}

        {!isLoading && items.length === 0 && (
          <View className="mt-10 items-center">
            <FontAwesome name="cutlery" size={32} color="#DDD6FE" />
            <Text className="mt-3 font-inter-bold text-base text-violet-900">No items found</Text>
            <Text className="mt-1 font-inter-light text-sm text-violet-500">Try again later</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  ActivityIndicator, 
  Animated, 
  Dimensions, 
  Modal, 
  PanResponder, 
  Pressable, 
  RefreshControl, 
  ScrollView, 
  Text, 
  TextInput, 
  View 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiCategory, ApiFavorite, extractArray } from '../../services/api';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────
type PanelType = 'filter' | 'sort' | 'offers' | null;
const FILTER_OPTIONS = ['All', 'Restaurants', 'Menu Items'];
const SORT_OPTIONS = ['Recently Added', 'Name A-Z', 'Price Low to High'];
const OFFER_OPTIONS = ['Any Offer', 'Featured Only'];

const FALLBACK_CATEGORIES = [
  { id: '1', name: 'Burger' },
  { id: '2', name: 'Pizza' },
  { id: '3', name: 'Sushi' },
  { id: '4', name: 'Pasta' },
  { id: '5', name: 'Desserts' },
];

function ShimmerBox({ width, height, borderRadius = 12, style }: { width?: number | string; height: number; borderRadius?: number; style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: false }),
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

function FavoriteSkeleton() {
  return (
    <View className="mb-4 overflow-hidden rounded-[24px] border border-violet-50 bg-white p-3">
      <View className="flex-row">
        <ShimmerBox width={100} height={100} borderRadius={16} />
        <View className="ml-4 flex-1 justify-center">
          <ShimmerBox width="70%" height={16} borderRadius={8} />
          <ShimmerBox width="40%" height={12} borderRadius={8} style={{ marginTop: 8 }} />
          <ShimmerBox width="30%" height={14} borderRadius={8} style={{ marginTop: 12 }} />
        </View>
      </View>
    </View>
  );
}

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<ApiFavorite[]>([]);
  const [apiTags, setApiTags] = useState<ApiCategory[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [hasActiveOrder, setHasActiveOrder] = useState(false);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('active_tracking_order').then(v => setHasActiveOrder(!!v)).catch(() => {});
  }, []));
  
  // Lazy loading state
  const [visibleCount, setVisibleCount] = useState(6);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(FILTER_OPTIONS[0]);
  const [selectedSort, setSelectedSort] = useState(SORT_OPTIONS[0]);
  const [selectedOffer, setSelectedOffer] = useState(OFFER_OPTIONS[0]);
  const [draftSelection, setDraftSelection] = useState('');
  
  const panelTranslateY = useRef(new Animated.Value(400)).current;
  const dragStartY = useRef(0);

  const loadData = useCallback(async (silent = false) => {
    // Favorites API disabled (no endpoint available)
    // TODO: re-enable when /favorites endpoint is available
    if (!silent) setIsLoading(false);
    setRefreshing(false);
    setFavorites([]);
    try {
      const tagRes = await api.getCategories();
      const categories = extractArray(tagRes);
      if (categories.length > 0) {
        setApiTags([{ id: 'all', name: 'All' } as ApiCategory, ...categories]);
      } else {
        setApiTags([{ id: 'all', name: 'All' } as ApiCategory, ...FALLBACK_CATEGORIES as any]);
      }
    } catch {
      setApiTags([{ id: 'all', name: 'All' } as ApiCategory, ...FALLBACK_CATEGORIES as any]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setVisibleCount(6);
    loadData(true);
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      await api.removeFavorite(id);
      setFavorites(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const scrollViewRef = useRef<ScrollView>(null);
  const [showTopButton, setShowTopButton] = useState(false);

  const handleScroll = ({ nativeEvent }: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    setShowTopButton(contentOffset.y > 300);
    const nearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 200;
    if (nearBottom && !isLoadingMore && visibleCount < filteredFavorites.length) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + 6, filteredFavorites.length));
        setIsLoadingMore(false);
      }, 500);
    }
  };

  // ── Sheet Controls ──────────────────────────────────────────────────────
  const openPanel = (type: Exclude<PanelType, null>) => {
    const current = type === 'filter' ? selectedFilter : type === 'sort' ? selectedSort : selectedOffer;
    setDraftSelection(current);
    setActivePanel(type);
    setPanelVisible(true);
    panelTranslateY.setValue(400);
    Animated.timing(panelTranslateY, { toValue: 0, duration: 240, useNativeDriver: false }).start();
  };

  const closePanel = () => {
    Animated.timing(panelTranslateY, { toValue: 400, duration: 220, useNativeDriver: false }).start(() => {
      setPanelVisible(false);
      setActivePanel(null);
    });
  };

  const applyPanel = () => {
    if (activePanel === 'filter') setSelectedFilter(draftSelection);
    if (activePanel === 'sort') setSelectedSort(draftSelection);
    if (activePanel === 'offers') setSelectedOffer(draftSelection);
    closePanel();
  };

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > Math.abs(g.dx) && g.dy > 2,
      onPanResponderGrant: () => { panelTranslateY.stopAnimation((v) => { dragStartY.current = v; }); },
      onPanResponderMove: (_, g) => { panelTranslateY.setValue(Math.max(0, dragStartY.current + g.dy)); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 1.1) { closePanel(); return; }
        Animated.timing(panelTranslateY, { toValue: 0, duration: 180, useNativeDriver: false }).start();
      },
    })
  ).current;

  // ── Filtered List ────────────────────────────────────────────────────────
  const filteredFavorites = useMemo(() => {
    let list = favorites;
    
    // Type Filter
    if (selectedFilter === 'Restaurants') list = list.filter(f => !!f.restaurant_id);
    if (selectedFilter === 'Menu Items') list = list.filter(f => !!f.menu_item_id);
    
    // Offers Filter (Featured Only)
    if (selectedOffer === 'Featured Only') {
      list = list.filter(f => (f.restaurant?.is_featured || (f.menu_item as any)?.is_featured));
    }

    // Tag Pill Filter (Category)
    if (activeTag && activeTag !== 'All') {
      const q = activeTag.toLowerCase();
      list = list.filter(f => {
        const item = f.restaurant || f.menu_item;
        if (!item) return false;
        
        const cuisines = (item as any)?.cuisine_type || [];
        const catName = (item as any)?.category_name || '';
        const name = item.name || '';
        const desc = (item as any).description || '';
        
        return cuisines.some((c: string) => c.toLowerCase().includes(q)) ||
               catName.toLowerCase().includes(q) ||
               name.toLowerCase().includes(q) ||
               desc.toLowerCase().includes(q);
      });
    }
    
    // Text Search
    if (query.trim()) {
      const q = query.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      list = list.filter(fav => {
        const item = fav.restaurant || fav.menu_item;
        if (!item) return true;
        const itemName = (item.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const itemDesc = ((item as any).description || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const restName = ((item as any).restaurant_name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        return itemName.includes(q) || 
               itemDesc.includes(q) ||
               (item as any)?.cuisine_type?.some((c: string) => c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q)) ||
               restName.includes(q);
      });
    }

    // Sort
    if (selectedSort === 'Name A-Z') {
      list = [...list].sort((a, b) => (a.restaurant?.name || a.menu_item?.name || '').localeCompare(b.restaurant?.name || b.menu_item?.name || ''));
    } else if (selectedSort === 'Price Low to High') {
      list = [...list].sort((a, b) => Number(a.menu_item?.price || 0) - Number(b.menu_item?.price || 0));
    }
    
    return list;
  }, [favorites, query, selectedFilter, selectedSort, selectedOffer, activeTag]);

  const visibleFavorites = useMemo(() => filteredFavorites.slice(0, visibleCount), [filteredFavorites, visibleCount]);

  const formatPrice = (v?: number | string | null) => {
    if (v == null || v === '') return 'P0.00';
    const n = Number(v);
    return Number.isNaN(n) ? `P${v}` : `P${n.toFixed(2)}`;
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />
      {/* Status Bar Background - pointerEvents="none" to prevent blocking header touches */}
      <View pointerEvents="none" className="absolute top-0 left-0 right-0 bg-violet-600" style={{ height: 100 }} /> 
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
      <View className="flex-1 bg-white">
        {/* ── Header ── (Exact Search UI style) */}
        <View className="bg-violet-600 px-4 pb-3 pt-3">
          <View className="h-11 flex-row items-center rounded-2xl border border-violet-200 bg-white px-3">
            <FontAwesome name="search" size={16} color="#7C3AED" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search favorites..."
              placeholderTextColor="#A78BFA"
              className="ml-3 flex-1 font-inter-light text-base text-violet-900"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')}>
                <FontAwesome name="times-circle" size={16} color="#A78BFA" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Filter Row & Tag Pills */}
        <View className="border-b border-violet-100 bg-white py-2">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
            <Pressable
              onPress={() => openPanel('filter')}
              className={`mr-2 h-9 flex-row items-center rounded-full border px-3 ${selectedFilter !== 'All' ? 'border-violet-600 bg-violet-50' : 'border-violet-200 bg-white'}`}>
              <FontAwesome name="sliders" size={12} color="#7C3AED" style={{ marginRight: 6 }} />
              <Text className="font-inter-semibold text-xs text-violet-900">{selectedFilter}</Text>
            </Pressable>
            
            <View className="mx-1 w-px h-6 self-center bg-violet-100" />

            {apiTags.map((tag) => (
              <Pressable
                key={tag.id}
                onPress={() => setActiveTag(tag.name === 'All' ? null : tag.name)}
                className={`mr-2 h-9 items-center justify-center rounded-full border px-4 ${
                  (activeTag === tag.name || (activeTag === null && tag.name === 'All'))
                    ? 'border-violet-600 bg-violet-600'
                    : 'border-violet-200 bg-violet-50'
                }`}>
                <Text className={`font-inter text-xs ${
                  (activeTag === tag.name || (activeTag === null && tag.name === 'All')) ? 'font-inter-bold text-white' : 'text-violet-700'
                }`}>
                  {tag.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          className="flex-1"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#7C3AED" 
              colors={["#7C3AED"]}
              progressBackgroundColor="#FFFFFF"
              progressViewOffset={10}
            />
          }>
          
          {isLoading && !refreshing ? (
            <View className="px-4">
              {[0, 1, 2, 3, 4].map(i => <FavoriteSkeleton key={i} />)}
            </View>
          ) : visibleFavorites.length === 0 ? (
            <View className="mt-20 items-center px-10">
              <View className="h-24 w-24 items-center justify-center rounded-full bg-violet-50 mb-6">
                <FontAwesome name={query || activeTag ? "search" : "heart-o"} size={40} color="#DDD6FE" />
              </View>
              <Text className="font-inter-bold text-xl text-violet-900 text-center">
                {query || activeTag ? 'No matches found' : 'No favorites yet'}
              </Text>
              <Text className="mt-2 text-center font-inter-light text-sm text-violet-500">
                {query || activeTag ? "Try adjusting your filters or search query." : "Save your favorite restaurants and dishes to find them quickly here."}
              </Text>
            </View>
          ) : (
            <View className="px-4">
              {visibleFavorites.map((fav) => {
                const isRestaurant = !!fav.restaurant_id;
                const item = fav.restaurant || fav.menu_item;
                const name = item?.name || (isRestaurant ? 'Restaurant' : 'Menu Item');
                const image = (item as any)?.cover_image_url || (item as any)?.image_url || (item as any)?.logo_url;
                const subtitle = isRestaurant 
                  ? (item as any)?.cuisine_type?.join(', ') || 'Various Cuisines'
                  : (item as any)?.restaurant_name || 'Delicious Dish';
                const price = (item as any)?.price;

                return (
                  <Pressable 
                    key={fav.id}
                    onPress={() => {
                      const targetId = isRestaurant ? fav.restaurant_id : (fav.menu_item?.restaurant_id || fav.restaurant_id);
                      if (targetId) router.push(`/restaurant/${targetId}` as any);
                    }}
                    className="mb-4 overflow-hidden rounded-[24px] border border-violet-100 bg-white shadow-sm shadow-violet-100/50">
                    <View className="flex-row p-3">
                      {image ? (
                        <Image source={{ uri: image }} contentFit="cover" style={{ width: 100, height: 100, borderRadius: 16 }} />
                      ) : (
                        <View className="h-[100px] w-[100px] items-center justify-center rounded-2xl bg-violet-50">
                          <FontAwesome name="image" size={32} color="#DDD6FE" />
                        </View>
                      )}
                      <View className="ml-4 flex-1 justify-center">
                        <Text className="font-inter-bold text-lg text-violet-900" numberOfLines={1}>{name}</Text>
                        <Text className="mt-1 font-inter-light text-sm text-violet-500" numberOfLines={1}>{subtitle}</Text>
                        {price && <Text className="mt-2 font-inter-extrabold text-base text-violet-700">{formatPrice(price)}</Text>}
                      </View>
                      <Pressable 
                        onPress={() => handleToggleFavorite(fav.id)}
                        className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-md">
                        <FontAwesome name="heart" size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
              
              {isLoadingMore && (
                <View className="py-4 items-center">
                  <ActivityIndicator color="#7C3AED" />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Scroll-to-top chevron — shown after scrolling, near tab bar */}
      {showTopButton && (
        <Pressable 
          onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
          style={{ bottom: hasActiveOrder ? 92 : 20, right: 16 }}
          className="absolute h-11 w-11 items-center justify-center rounded-full bg-violet-600 shadow-lg shadow-violet-900/30">
          <FontAwesome name="chevron-up" size={15} color="white" />
        </Pressable>
      )}

      {/* Filter Bottom Sheet */}
      <Modal visible={panelVisible} transparent animationType="none" onRequestClose={closePanel}>
        <View className="flex-1 justify-end">
          <Pressable onPress={closePanel} className="absolute inset-0 bg-black/55" />
          <Animated.View
            {...sheetPanResponder.panHandlers}
            style={{
              transform: [{ translateY: panelTranslateY }],
              height: 400, backgroundColor: 'white',
              borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden',
            }}>
            <View className="flex-1 p-6">
              <View className="items-center mb-2">
                <View className="h-1.5 w-12 rounded-full bg-violet-100" />
              </View>
              <View className="flex-row items-center justify-between mb-6">
                <Text className="font-inter-bold text-2xl text-violet-900">
                  {activePanel === 'filter' ? 'Type' : activePanel === 'sort' ? 'Sort' : 'Offers'}
                </Text>
                <Pressable onPress={closePanel} className="h-10 w-10 items-center justify-center rounded-full bg-violet-50">
                  <FontAwesome name="times" size={16} color="#7C3AED" />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {(activePanel === 'filter' ? FILTER_OPTIONS : activePanel === 'sort' ? SORT_OPTIONS : OFFER_OPTIONS).map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setDraftSelection(option)}
                    className={`mb-3 flex-row items-center justify-between rounded-2xl border p-4 ${draftSelection === option ? 'border-violet-600 bg-violet-50' : 'border-violet-100 bg-white'}`}>
                    <Text className={`font-inter-bold text-base ${draftSelection === option ? 'text-violet-900' : 'text-violet-400'}`}>{option}</Text>
                    {draftSelection === option && <FontAwesome name="check-circle" size={20} color="#7C3AED" />}
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable onPress={applyPanel} className="mt-4 h-14 items-center justify-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-600/30">
                <Text className="font-inter-bold text-base text-white">Apply</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  </View>
);
}

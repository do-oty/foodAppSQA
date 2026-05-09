import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Modal, PanResponder, Pressable, RefreshControl,
  ScrollView, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { api, ApiCategory, ApiRestaurant, extractArray } from '../../services/api';
import { StatusBar } from 'expo-status-bar';
import { useAlert } from '../../components/ui/custom-alert';
import { useRouter } from 'expo-router';

// ─── Constants ────────────────────────────────────────────────────────────────
type PanelType = 'filter' | 'sort' | 'offers' | null;
const FILTER_OPTIONS = ['All', 'Fast Delivery', 'Near Me', 'Highest Rated', 'Open Now'];
const SORT_OPTIONS = ['Best Match', 'Delivery Fee Low to High', 'Highest Rated', 'Newest'];
const OFFER_OPTIONS = ['Any Offer', 'Free Delivery', '50% Off', 'Buy 1 Take 1', 'Featured Only'];

// ─── Shimmer ──────────────────────────────────────────────────────────────────
function ShimmerBox({ height, width, borderRadius = 12, style }: { height: number; width?: number | string; borderRadius?: number; style?: any }) {
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

function RestaurantCardSkeleton() {
  return (
    <View className="mb-3 rounded-3xl border border-violet-100 bg-white p-3">
      <ShimmerBox height={140} borderRadius={16} />
      <View style={{ marginTop: 12 }}><ShimmerBox height={14} width="60%" borderRadius={8} /></View>
      <View style={{ marginTop: 6 }}><ShimmerBox height={11} width="40%" borderRadius={8} /></View>
    </View>
  );
}

const formatPrice = (fee?: number | null) =>
  fee != null ? `P${fee.toFixed(2)}` : 'N/A';

// ─── Filter Bottom Sheet ──────────────────────────────────────────────────────
function FilterSheet({
  visible, panelType, options, draftSelection,
  onSelect, onApply, onReset, onClose, panelTranslateY, panResponder,
}: {
  visible: boolean; panelType: PanelType; options: string[]; draftSelection: string;
  onSelect: (v: string) => void; onApply: () => void; onReset: () => void;
  onClose: () => void; panelTranslateY: Animated.Value; panResponder: any;
}) {
  const titles: Record<string, string> = { filter: 'Filter', sort: 'Sort', offers: 'Offers' };
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable onPress={onClose} className="absolute bottom-0 left-0 right-0 top-0 bg-black/55" />
        <Animated.View
          style={{
            transform: [{ translateY: panelTranslateY }],
            position: 'absolute', left: 0, right: 0, bottom: 0,
            height: 400, backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden',
          }}>
          <View style={{ flex: 1 }} className="px-4 pb-4 pt-3">
            <View className="items-center pb-2" {...panResponder.panHandlers}>
              <View className="h-1.5 w-12 rounded-full bg-violet-200" />
            </View>
            <View className="mb-2 flex-row items-center justify-between px-1" {...panResponder.panHandlers}>
              <View>
                <Text className="font-inter-bold text-xl text-violet-900">
                  {panelType ? titles[panelType] : ''}
                </Text>
                <Text className="mt-0.5 font-inter-light text-xs text-violet-500">Choose one option</Text>
              </View>
              <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-violet-50">
                <FontAwesome name="times" size={16} color="#7C3AED" />
              </Pressable>
            </View>

            <View className="mb-3 flex-1">
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {options.map((option) => {
                  const active = draftSelection === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => onSelect(option)}
                      className={`mb-2 min-h-[52px] flex-row items-center rounded-xl border px-3 ${
                        active ? 'border-violet-600 bg-violet-50' : 'border-violet-200 bg-white'
                      }`}>
                      <View className={`mr-3 h-5 w-5 items-center justify-center rounded-full border-2 ${
                        active ? 'border-violet-700 bg-violet-100' : 'border-violet-500 bg-white'
                      }`}>
                        {active && <View className="h-2.5 w-2.5 rounded-full bg-violet-700" />}
                      </View>
                      <Text className={`flex-1 font-inter text-base ${active ? 'font-inter-bold text-violet-800' : 'text-violet-900'}`}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View className="mx-1 mb-1 flex-row">
              <Pressable onPress={onReset} className="mr-2 h-10 flex-1 items-center justify-center rounded-xl border border-violet-200 bg-white">
                <Text className="font-inter-bold text-sm text-violet-700">Reset</Text>
              </Pressable>
              <Pressable onPress={onApply} className="ml-2 h-10 flex-1 items-center justify-center rounded-xl bg-violet-600">
                <Text className="font-inter-bold text-sm text-white">Apply</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SearchTabScreen() {
  const { isAuthenticated } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [restaurants, setRestaurants] = useState<ApiRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hasActiveOrder, setHasActiveOrder] = useState(false);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('active_tracking_order').then(v => setHasActiveOrder(!!v)).catch(() => {});
  }, []));

  // Favorites API disabled (no endpoint)
  const toggleFavorite = async (restaurantId?: string, menuItemId?: string) => {
    if (!isAuthenticated) return;
    const targetId = restaurantId || menuItemId;
    if (!targetId) return;

    const isFav = favorites.has(targetId);
    setFavorites(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(targetId);
      else next.add(targetId);
      return next;
    });

    try {
      if (isFav) await api.removeFavorite(targetId);
      else await api.addFavorite({ restaurant_id: restaurantId, menu_item_id: menuItemId } as any);
    } catch (e) {
      setFavorites(prev => {
        const next = new Set(prev);
        if (isFav) next.add(targetId);
        else next.delete(targetId);
        return next;
      });
    }
  };

  // Filter state
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(FILTER_OPTIONS[0]);
  const [selectedSort, setSelectedSort] = useState(SORT_OPTIONS[0]);
  const [selectedOffer, setSelectedOffer] = useState(OFFER_OPTIONS[0]);
  const [draftSelection, setDraftSelection] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);

  const panelTranslateY = useRef(new Animated.Value(400)).current;
  const dragStartY = useRef(0);

  // Load categories once
  useEffect(() => {
    api.getCategories().then((r) => setCategories(extractArray(r))).catch(() => {});
  }, []);

  // ── Sheet controls ──────────────────────────────────────────────────────
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

  const resetPanel = () => {
    if (activePanel === 'filter') setDraftSelection(FILTER_OPTIONS[0]);
    if (activePanel === 'sort') setDraftSelection(SORT_OPTIONS[0]);
    if (activePanel === 'offers') setDraftSelection(OFFER_OPTIONS[0]);
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

  const sheetOptions = useMemo(() => {
    if (activePanel === 'filter') return FILTER_OPTIONS;
    if (activePanel === 'sort') return SORT_OPTIONS;
    if (activePanel === 'offers') return OFFER_OPTIONS;
    return [];
  }, [activePanel]);

  // ── Search ──────────────────────────────────────────────────────────────
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // Note: selectedOffer/selectedSort/selectedFilter are applied client-side only (not sent to API)

  const doSearch = async (sQuery: string) => {
    const trimmedQuery = sQuery.trim();
    console.log('[SEARCH] doSearch called with:', JSON.stringify(trimmedQuery), 'Categories:', activeCategories);
    
    // Allow searching if there's a query OR categories selected
    if (!trimmedQuery && activeCategories.length === 0) {
      setRestaurants([]);
      setMenuItems([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    
    try {
      // 1. Fetch Restaurants
      // Always pass parameters to the API. Combine query and categories if needed.
      const searchParts = [];
      if (trimmedQuery) searchParts.push(trimmedQuery);
      if (activeCategories.length > 0) searchParts.push(...activeCategories);
      const combinedSearch = searchParts.join(' ');

      console.log(`[SEARCH] Fetching restaurants with combined search: "${combinedSearch}"...`);
      let res = await api.getRestaurants({ search: combinedSearch || undefined });
      console.log('[SEARCH] API response:', res);
      
      let allRestaurants = extractArray(res);
      
      // FALLBACK: If API search returned nothing but we have a query, fetch ALL and filter locally
      if (allRestaurants.length === 0 && (trimmedQuery || activeCategories.length > 0)) {
        console.log('[SEARCH] API search returned nothing. Falling back to fetching all restaurants for client-side search...');
        const fallbackRes = await api.getRestaurants();
        allRestaurants = extractArray(fallbackRes);
      }

      console.log('[SEARCH] Processing', allRestaurants.length, 'restaurants for filtering...');

      // Filter restaurants client-side by name/desc/cuisine as a refinement
      const nq = trimmedQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const nameMatches = allRestaurants.filter((r: any) => {
        if (!nq) return true; // if no query, all are matches
        const name = (r.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const desc = (r.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const cuisine = (r.cuisine_type || []).join(' ').toLowerCase();
        return name.includes(nq) || desc.includes(nq) || cuisine.includes(nq);
      });
      
      console.log('[SEARCH] Final restaurant matches:', nameMatches.length);
      setRestaurants(nameMatches);

      // 2. Fetch Menu Items (via individual restaurant menus)
      // Since there's no global menu search API, we fetch menus for the top matched restaurants
      const toFetch = allRestaurants.slice(0, 15);
      if (toFetch.length > 0) {
        console.log('[SEARCH] Fetching menus for', toFetch.length, 'restaurants to find item matches...');
        const menuReqs = toFetch.map((r: any) =>
          api.getMenu(r.id).then(m => {
            const items = extractArray(m);
            return items.map((item: any) => ({
              ...item, restaurant_id: r.id, restaurant_name: r.name, delivery_fee: r.delivery_fee
            }));
          }).catch((e: any) => { console.warn(`[SEARCH] Menu failed for ${r.name}:`, e?.message); return []; })
        );
        
        const menus = await Promise.all(menuReqs);
        const allMenuItems = menus.flat();
        
        // Filter menu items client-side by query
        const matchedItems = allMenuItems.filter((m: any) => {
          if (!nq) return true;
          const name = (m.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const desc = (m.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return name.includes(nq) || desc.includes(nq);
        });
        
        console.log('[SEARCH] Matching menu items:', matchedItems.length);
        setMenuItems(matchedItems);
      } else {
        setMenuItems([]);
      }

    } catch (err: any) {
      console.error('[SEARCH] doSearch error:', err);
      setRestaurants([]);
      setMenuItems([]);
      showAlert({
        title: 'Search Error',
        message: err?.message || 'Something went wrong while searching. The server might be waking up—please try again in a few seconds.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Ref always points to latest doSearch — fixes stale closure in debounce
  const doSearchRef = useRef(doSearch);
  doSearchRef.current = doSearch; // update on every render (no useEffect needed)

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await doSearchRef.current(query);
  }, [query]);
  
  const filteredRestaurantsList = useMemo(() => {
    if (activeCategories.length === 0) return restaurants;
    return restaurants.filter(r => {
      const cuisines = (r.cuisine_type || []).map(c => c.toLowerCase());
      const name = (r.name || '').toLowerCase();
      const desc = (r.description || '').toLowerCase();
      
      return activeCategories.some(cat => {
        const c = cat.toLowerCase();
        return cuisines.some(cuisine => cuisine.includes(c)) || 
               name.includes(c) || 
               desc.includes(c);
      });
    });
  }, [restaurants, activeCategories]);

  const filteredMenuItemsList = useMemo(() => {
    if (activeCategories.length === 0) return menuItems;
    return menuItems.filter(m => {
      const catName = (m.category_name || '').toLowerCase();
      const name = (m.name || '').toLowerCase();
      const desc = (m.description || '').toLowerCase();
      
      return activeCategories.some(cat => {
        const c = cat.toLowerCase();
        return catName.includes(c) || name.includes(c) || desc.includes(cat.toLowerCase());
      });
    });
  }, [menuItems, activeCategories]);

  const scrollViewRef = useRef<ScrollView>(null);
  const [showTopButton, setShowTopButton] = useState(false);

  const handleScroll = ({ nativeEvent }: any) => {
    const { contentOffset } = nativeEvent;
    setShowTopButton(contentOffset.y > 300);
  };

  const toggleCategory = (catName: string) => {
    setActiveCategories((prev) => {
      const next = prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName];
      // Trigger search with current query to update results based on new category set
      doSearchRef.current(query);
      return next;
    });
  };

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearchRef.current(text), 450);
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />
      {/* Status Bar Background - pointerEvents="none" to prevent blocking header touches */}
      <View pointerEvents="none" className="absolute top-0 left-0 right-0 bg-violet-600" style={{ height: 100 }} /> 
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <View className="flex-1 bg-white">

      {/* ── Header ── */}
      <View className="bg-violet-600 px-4 pb-3 pt-3">
        <View className="h-11 flex-row items-center rounded-2xl border border-violet-200 bg-white px-3">
          <FontAwesome name="search" size={16} color="#7C3AED" />
          <TextInput
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Search restaurants, dishes..."
            placeholderTextColor="#A78BFA"
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => { if (debounceRef.current) clearTimeout(debounceRef.current); doSearchRef.current(query); }}
            className="ml-3 flex-1 font-inter-light text-base text-violet-900"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setRestaurants([]); setMenuItems([]); setHasSearched(false); }}>
              <FontAwesome name="times-circle" size={16} color="#A78BFA" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Filter row ── */}
      <View className="border-b border-violet-100 bg-white px-4 py-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* Filter */}
          <Pressable
            onPress={() => openPanel('filter')}
            className={`mr-2 h-9 flex-row items-center justify-center rounded-full border px-3 ${
              selectedFilter !== FILTER_OPTIONS[0] ? 'border-violet-600 bg-violet-50' : 'border-violet-200 bg-white'
            }`}>
            <FontAwesome name="sliders" size={12} color={selectedFilter !== FILTER_OPTIONS[0] ? '#7C3AED' : '#475569'} />
            {selectedFilter !== FILTER_OPTIONS[0] && (
              <Text className="ml-1.5 font-inter-bold text-[10px] text-violet-700">{selectedFilter}</Text>
            )}
          </Pressable>
          {/* Sort */}
          <Pressable
            onPress={() => openPanel('sort')}
            className={`mr-2 h-9 flex-row items-center rounded-full border px-3 ${
              selectedSort !== SORT_OPTIONS[0] ? 'border-violet-600 bg-violet-50' : 'border-violet-300 bg-white'
            }`}>
            <Text className="font-inter-bold text-[10px] uppercase text-violet-500">Sort </Text>
            <Text className="font-inter-semibold text-xs text-violet-900">{selectedSort}</Text>
          </Pressable>
          {/* Offers */}
          <Pressable
            onPress={() => openPanel('offers')}
            className={`mr-2 h-9 flex-row items-center rounded-full border px-3 ${
              selectedOffer !== OFFER_OPTIONS[0] ? 'border-violet-600 bg-violet-50' : 'border-violet-300 bg-white'
            }`}>
            <Text className="font-inter-bold text-[10px] uppercase text-violet-500">Offers </Text>
            <Text className="font-inter-semibold text-xs text-violet-900">{selectedOffer}</Text>
          </Pressable>
          {/* Separator */}
          <View className="mr-2 w-px self-stretch bg-violet-100" />
          {/* Category pills */}
          {categories.map((cat) => {
            const isActive = activeCategories.includes(cat.name);
            return (
              <Pressable
                key={cat.id}
                onPress={() => toggleCategory(cat.name)}
                className={`mr-2 h-9 items-center justify-center rounded-full border px-3 ${
                  isActive ? 'border-violet-600 bg-violet-600' : 'border-violet-200 bg-violet-50'
                }`}>
                <Text className={`text-center font-inter text-xs ${isActive ? 'font-inter-bold text-white' : 'text-violet-700'}`}>
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Results ── */}
      <ScrollView 
        ref={scrollViewRef}
        className="flex-1 px-4 pt-4" 
        contentContainerStyle={{ paddingBottom: 40 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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

        {/* Loading */}
        {isLoading && [0, 1, 2, 3].map((i) => <RestaurantCardSkeleton key={i} />)}

        {/* Empty / not searched yet */}
        {!isLoading && !hasSearched && (
          <View className="mt-12 items-center">
            <FontAwesome name="search" size={40} color="#DDD6FE" />
            <Text className="mt-4 font-inter-bold text-base text-violet-900">Find your next meal</Text>
            <Text className="mt-1 text-center font-inter-light text-sm text-violet-500">
              Type a restaurant name, dish, or cuisine
            </Text>
          </View>
        )}

        {/* No results */}
        {!isLoading && hasSearched && filteredRestaurantsList.length === 0 && filteredMenuItemsList.length === 0 && (
          <View className="mt-12 items-center px-6">
            <FontAwesome name="cutlery" size={40} color="#DDD6FE" />
            <Text className="mt-4 text-center font-inter-bold text-base text-violet-900">
              No results found for "{query || (activeCategories.length > 0 ? activeCategories.join(', ') : 'your search')}"
            </Text>
            <Text className="mt-1 text-center font-inter-light text-sm text-violet-500">
              Try adjusting your filters or search terms
            </Text>
          </View>
        )}

        {/* Results */}
        {!isLoading && filteredRestaurantsList.length > 0 && (
          <Text className="mb-3 font-inter-bold text-lg text-violet-900">Restaurants</Text>
        )}
        {!isLoading && filteredRestaurantsList.map((r) => (
          <Pressable 
            key={r.id} 
            onPress={() => { const router = require('expo-router').router; router.push(`/restaurant/${r.id}`); }}
            className="mb-3 rounded-3xl border border-violet-200 bg-white p-3">
            <View className="relative">
              {r.cover_image_url || r.logo_url ? (
                <Image
                  source={{ uri: r.cover_image_url ?? r.logo_url ?? undefined }}
                  contentFit="cover"
                  style={{ height: 140, width: '100%', borderRadius: 16 }}
                />
              ) : (
                <View className="h-[140px] rounded-2xl bg-violet-100 items-center justify-center">
                  <FontAwesome name="cutlery" size={24} color="#DDD6FE" />
                </View>
              )}
              <Pressable 
                onPress={() => toggleFavorite(r.id, undefined)}
                className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm">
                <FontAwesome name={favorites.has(r.id) ? 'heart' : 'heart-o'} size={12} color={favorites.has(r.id) ? '#EF4444' : '#7C3AED'} />
              </Pressable>
            </View>
            <Text className="mt-3 font-inter-bold text-base text-violet-900">{r.name}</Text>
            {r.description && (
              <Text numberOfLines={1} className="mt-0.5 font-inter-light text-sm text-violet-500">{r.description}</Text>
            )}
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="font-inter-light text-xs text-violet-500">
                Delivery {formatPrice(r.delivery_fee)}
              </Text>
            </View>
          </Pressable>
        ))}

        {!isLoading && filteredMenuItemsList.length > 0 && (
          <Text className="mb-3 mt-4 font-inter-bold text-lg text-violet-900">Menu Items</Text>
        )}
        {!isLoading && filteredMenuItemsList.map((m: any) => (
          <Pressable 
            key={m.id} 
            onPress={() => { const router = require('expo-router').router; router.push(`/restaurant/${m.restaurant_id}`); }}
            className="mb-3 flex-row items-center rounded-3xl border border-violet-200 bg-white p-3">
            <View className="relative">
              {m.image_url ? (
                <Image source={{ uri: m.image_url }} contentFit="cover" style={{ height: 80, width: 80, borderRadius: 12 }} />
              ) : (
                <View className="h-[80px] w-[80px] rounded-xl bg-violet-100 items-center justify-center">
                  <FontAwesome name="cutlery" size={24} color="#DDD6FE" />
                </View>
              )}
            </View>
            <View className="ml-3 flex-1">
              <View className="flex-row items-start justify-between">
                <Text className="font-inter-bold text-base text-violet-900 flex-1">{m.name}</Text>
                <Pressable 
                  onPress={() => toggleFavorite(undefined, m.id)}
                  className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-violet-50">
                  <FontAwesome name={favorites.has(m.id) ? 'heart' : 'heart-o'} size={12} color={favorites.has(m.id) ? '#EF4444' : '#7C3AED'} />
                </Pressable>
              </View>
              <Text className="mt-0.5 font-inter-light text-xs text-violet-500">{m.restaurant_name}</Text>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="font-inter-bold text-sm text-violet-700">{formatPrice(m.price)}</Text>
                <Text className="font-inter-light text-xs text-violet-500">Delivery {formatPrice(m.delivery_fee)}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Scroll-to-top chevron — shown after scrolling, near tab bar */}
      {showTopButton && (
        <Pressable 
          onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
          style={{ bottom: hasActiveOrder ? 92 : 20, right: 16 }}
          className="absolute h-11 w-11 items-center justify-center rounded-full bg-violet-600 shadow-lg shadow-violet-900/30">
          <FontAwesome name="chevron-up" size={15} color="white" />
        </Pressable>
      )}

      {/* ── Filter sheet ── */}
      <FilterSheet
        visible={panelVisible}
        panelType={activePanel}
        options={sheetOptions}
        draftSelection={draftSelection}
        onSelect={setDraftSelection}
        onApply={applyPanel}
        onReset={resetPanel}
        onClose={closePanel}
        panelTranslateY={panelTranslateY}
        panResponder={sheetPanResponder}
      />
        </View>
      </SafeAreaView>
    </View>
  );
}

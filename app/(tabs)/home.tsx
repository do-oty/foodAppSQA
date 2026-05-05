import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Modal, PanResponder, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { api, ApiCategory, ApiRestaurant, extractArray, ApiAddress } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { StatusBar } from 'expo-status-bar';

const FALLBACK_TAGS = ['Burger', 'Milktea', 'Pizza', 'Sushi', 'Pasta', 'Sisig', 'Halo-halo'];

type PanelType = 'filter' | 'sort' | 'offers' | 'address' | null;

const FILTER_OPTIONS = ['All', 'Fast Delivery', 'Near Me', 'Highest Rated', 'Open Now'];
const SORT_OPTIONS = ['Best Match', 'Delivery Fee Low to High', 'Highest Rated', 'Newest', 'Fastest Delivery'];
const OFFER_OPTIONS = ['Any Offer', 'Free Delivery', '50% Off', 'Buy 1 Take 1', 'Featured Only'];

function PillSkeleton({ width = 72 }: { width?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return (
    <Animated.View
      style={{ width, height: 32, borderRadius: 999, backgroundColor: '#DDD6FE', opacity, marginRight: 8 }}
    />
  );
}

// ─── Shimmer Skeleton ────────────────────────────────────────────────────────
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
      style={[
        { width: width ?? '100%', height, borderRadius, backgroundColor: '#DDD6FE', opacity },
        style,
      ]}
    />
  );
}

function FeaturedCardSkeleton({ cardWidth }: { cardWidth: number }) {
  return (
    <View style={{ width: cardWidth }} className="mr-3 h-[290px] rounded-3xl bg-gray-50 p-5 justify-between">
      <View>
        <ShimmerBox width={60} height={22} borderRadius={99} />
        <ShimmerBox width={180} height={36} borderRadius={8} style={{ marginTop: 12 }} />
        <ShimmerBox width={120} height={16} borderRadius={8} style={{ marginTop: 8 }} />
      </View>
      <ShimmerBox height={112} borderRadius={16} />
    </View>
  );
}

function HorizontalCardSkeleton() {
  return (
    <View className="mr-3 w-72 rounded-3xl border border-violet-100 bg-white p-3">
      <ShimmerBox height={112} borderRadius={16} />
      <ShimmerBox width={160} height={14} borderRadius={8} style={{ marginTop: 12 }} />
      <ShimmerBox width={110} height={11} borderRadius={8} style={{ marginTop: 8 }} />
    </View>
  );
}

function FeedCardSkeleton() {
  return (
    <View className="mb-3 rounded-3xl border border-violet-100 bg-white p-3">
      <ShimmerBox height={180} borderRadius={16} />
      <ShimmerBox width={180} height={14} borderRadius={8} style={{ marginTop: 12 }} />
      <ShimmerBox width={120} height={11} borderRadius={8} style={{ marginTop: 8 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        <ShimmerBox width={70} height={11} borderRadius={8} />
        <ShimmerBox width={60} height={11} borderRadius={8} />
      </View>
    </View>
  );
}

type RestaurantMenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  category_name?: string | null;
  restaurant_name?: string | null;
  restaurant_rating?: number | null;
  delivery_fee?: number | null;
  is_available?: boolean;
};



const formatPrice = (price?: number | string | null): string => {
  if (price === null || typeof price === 'undefined' || price === '') return 'Price N/A';
  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice)) return `P${price}`;
  return `P${numericPrice.toFixed(2)}`;
};

const promoBadgeFor = (rating?: number | null): string => {
  if (!rating) return 'NEW';
  if (rating >= 4.8) return 'HOT';
  if (rating >= 4.5) return 'TRENDING';
  return 'POPULAR';
};

export default function HomeTabScreen() {
  const router = useRouter();
  const { width } = Dimensions.get('window');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const { isAuthenticated } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Favorites API disabled (no endpoint available)
  const fetchFavorites = useCallback(async () => {
    // TODO: re-enable when /favorites endpoint is available
    return;
  }, [isAuthenticated]);

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
    
    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(id);
      else next.add(id);
      return next;
    });

    try {
      if (isFav) {
        const res = await api.getFavorites();
        const fav = extractArray(res).find((f: any) => f.restaurant_id === restaurantId || f.menu_item_id === menuItemId);
        if (fav) await api.removeFavorite(fav.id);
      } else {
        const data = { 
          restaurant_id: restaurantId || null, 
          menu_item_id: menuItemId || null 
        };
        console.log('Adding favorite:', data);
        const res = await api.addFavorite(data as any);
        console.log('Favorite added response:', res);
        Alert.alert('Success', 'Added to favorites!');
      }
    } catch (err: any) {
      console.error('Favorite toggle failed:', err);
      Alert.alert('Error', err?.message || 'Failed to update favorites. Please try again.');
      fetchFavorites(); // Revert on error
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const [address, setAddress] = useState('SET YOUR LOCATION');
  const [addressSubtitle, setAddressSubtitle] = useState('Tap to add address');
  const [selectedFilter, setSelectedFilter] = useState(FILTER_OPTIONS[0]);
  const [selectedSort, setSelectedSort] = useState(SORT_OPTIONS[0]);
  const [selectedOffer, setSelectedOffer] = useState(OFFER_OPTIONS[0]);
  const [selectedQuickPills, setSelectedQuickPills] = useState<string[]>([]);
  const [draftSelection, setDraftSelection] = useState('');
  const [apiTags, setApiTags] = useState<ApiCategory[]>([]);
  const [restaurants, setRestaurants] = useState<ApiRestaurant[]>([]);
  const [mainMenuItems, setMainMenuItems] = useState<RestaurantMenuItem[]>([]);
  const [isLoadingMainMenu, setIsLoadingMainMenu] = useState(true);
  const [mainMenuError, setMainMenuError] = useState<string | null>(null);
  const [visibleFoodCount, setVisibleFoodCount] = useState(6);
  const [isLoadingMoreFood, setIsLoadingMoreFood] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<ApiAddress[]>([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    street_address: '',
    city: '',
    state: '',
    postal_code: ''
  });
  const [showProvinceOptions, setShowProvinceOptions] = useState(false);
  const [showCityOptions, setShowCityOptions] = useState(false);

  const handleSaveAddress = async () => {
    const { label, street_address, city, state, postal_code } = addressForm;
    if (!street_address.trim() || !city.trim() || !state.trim()) {
      Alert.alert('Missing Info', 'Please fill in street, city, and state.');
      return;
    }
    try {
      await api.createAddress({ label, street_address, city, state, postal_code, is_default: savedAddresses.length === 0 });
      const res = await api.getAddresses();
      const addrs = extractArray<ApiAddress>(res);
      setSavedAddresses(addrs);
      setAddressForm({ label: 'Home', street_address: '', city: '', state: '', postal_code: '' });
      setIsAddingAddress(false);
      setRefreshTrigger(t => t + 1);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not save address.');
    }
  };

  const onSelectAddress = (addr: ApiAddress) => {
    const displayStreet = addr.street_address || addr.city || 'Address';
    setAddress(displayStreet.toUpperCase());
    setAddressSubtitle(`${addr.city}${addr.state ? `, ${addr.state}` : ''}`);
    closePanel();
  };

  const provincesData = require('philippines/provinces.json') as { name: string; key: string }[];
  const citiesData = require('philippines/cities.json') as { name: string; province: string }[];
  const sortedProvinces = [...provincesData].sort((a, b) => a.name.localeCompare(b.name));
  const provinceList = sortedProvinces.map((p) => p.name);
  const provinceGrouped = buildGroupedByLetter(provinceList);
  const selectedProvinceKey = sortedProvinces.find((p) => p.name === addressForm.state)?.key;
  const cityNamesRaw = selectedProvinceKey
    ? citiesData.filter((item) => item.province === selectedProvinceKey).map((item) => item.name)
    : [];
  const cityGrouped = buildGroupedByLetter(cityNamesRaw);

  function buildGroupedByLetter(items: string[]) {
    const groups: Record<string, string[]> = {};
    items.forEach((item) => {
      const letter = item[0]?.toUpperCase() ?? '#';
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(item);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, values]) => ({
        letter,
        values: values.sort((a, b) => a.localeCompare(b)),
      }));
  }


  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const panelTranslateY = useRef(new Animated.Value(420)).current;
  const panelHeight = 420;
  const dragStartY = useRef(0);

  const openPanel = (type: Exclude<PanelType, null>) => {
    const currentValue = type === 'filter' ? selectedFilter : type === 'sort' ? selectedSort : selectedOffer;
    setDraftSelection(currentValue);
    setActivePanel(type);
    setPanelVisible(true);
    panelTranslateY.setValue(420);
    Animated.timing(panelTranslateY, {
      toValue: 0,
      duration: 240,
      useNativeDriver: false,
    }).start();
  };

  const closePanel = () => {
    Animated.timing(panelTranslateY, {
      toValue: 420,
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      setPanelVisible(false);
      setActivePanel(null);
    });
  };

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 2,
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 2,
      onPanResponderGrant: () => {
        panelTranslateY.stopAnimation((value) => {
          dragStartY.current = typeof value === 'number' ? value : 0;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const nextY = Math.max(0, dragStartY.current + gestureState.dy);
        panelTranslateY.setValue(nextY);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 110 || gestureState.vy > 1.1) {
          closePanel();
          return;
        }
        Animated.timing(panelTranslateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.timing(panelTranslateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const sheetTitle = useMemo(() => {
    if (activePanel === 'filter') return 'Filter';
    if (activePanel === 'sort') return 'Sort';
    if (activePanel === 'offers') return 'Offers';
    return '';
  }, [activePanel]);

  const sheetOptions = useMemo(() => {
    if (activePanel === 'filter') return FILTER_OPTIONS;
    if (activePanel === 'sort') return SORT_OPTIONS;
    if (activePanel === 'offers') return OFFER_OPTIONS;
    return [];
  }, [activePanel]);

  const onSelectOption = (value: string) => {
    setDraftSelection(value);
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

  const toggleQuickPill = (pill: string) => {
    setSelectedQuickPills((prev) => (prev.includes(pill) ? prev.filter((value) => value !== pill) : [...prev, pill]));
  };

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('active_tracking_order').then(val => {
        setHasActiveOrder(!!val);
      }).catch(() => {});
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      if (isAuthenticated) {
        api.getCart().then(res => {
          if (isActive) setCartCount(extractArray(res).length);
        }).catch(() => {
          if (isActive) setCartCount(0);
        });
      } else {
        setCartCount(0);
      }
      return () => { isActive = false; };
    }, [isAuthenticated])
  );

  useEffect(() => {
    let isActive = true;
    const fetchCategories = async () => {
      try {
        const result = await api.getCategories();
        const categories: ApiCategory[] = extractArray(result)
          .map((c: any) => ({ id: String(c?.id ?? ''), name: String(c?.name ?? ''), icon_url: c?.icon_url ?? null }))
          .filter((c: ApiCategory) => c.id && c.name);
        
        categories.unshift({ id: 'all', name: 'All', icon_url: null });
        if (isActive) setApiTags(categories);
      } catch {
        if (isActive) setApiTags([{ id: 'all', name: 'All', icon_url: null }]);
      }
    };
    fetchCategories();
    return () => { isActive = false; };
  }, []);

  const fetchMainMenuItems = useCallback(async () => {
    console.log('[HOME] fetchMainMenuItems START');
    setIsLoadingMainMenu(true);
    setMainMenuError(null);
    try {
      console.log('[HOME] Calling api.getRestaurants() with no params...');
      const result = await api.getRestaurants(); // NO params — search/filter done client-side
      console.log('[HOME] getRestaurants raw response:', result);
      const newRestaurants = extractArray(result);
      console.log('[HOME] Restaurants count:', newRestaurants.length, newRestaurants.map((r:any) => r.name));

      if (newRestaurants.length === 0) {
        console.warn('[HOME] No restaurants returned!');
        setMainMenuItems([]);
        setRestaurants([]);
        return;
      }

      const menuRequests = newRestaurants.map(r =>
        api.getMenu(r.id).then(m => {
          const items = extractArray(m);
          console.log(`[HOME] Menu "${r.name}": ${items.length} items`);
          return items.map((i: any) => ({
            ...i,
            restaurant_id: r.id,
            restaurant_name: r.name,
            restaurant_rating: r.average_rating,
            delivery_fee: r.delivery_fee
          }));
        }).catch((e) => { console.warn(`[HOME] Menu failed for ${r.name}:`, e?.message); return []; })
      );

      const menuResults = await Promise.all(menuRequests);
      const newItems = menuResults.flat().filter(i => i.is_available !== false);
      console.log('[HOME] Total menu items loaded:', newItems.length);
      setMainMenuItems(newItems);
      setRestaurants(newRestaurants);
    } catch (err: any) {
      console.error('[HOME] fetchMainMenuItems CATCH:', err?.message);
      setMainMenuError('Could not load menu. Pull down to retry.');
    } finally {
      console.log('[HOME] fetchMainMenuItems DONE');
      setIsLoadingMainMenu(false);
      setIsLoadingMoreFood(false);
      setRefreshing(false);
    }
  }, []); // no deps — only fetches once on mount and on manual refresh

  useEffect(() => {
    fetchMainMenuItems();
  }, [refreshTrigger, fetchMainMenuItems]);

  useEffect(() => {
    setVisibleFoodCount(6);
  }, [activeTag, searchQuery, selectedFilter, selectedOffer, selectedSort, mainMenuItems.length]);

  const filteredMenuItems = useMemo(() => {
    if (!activeTag || activeTag === 'All') return mainMenuItems;
    const tag = activeTag.toLowerCase();
    const tagId = apiTags.find(t => t.name.toLowerCase() === tag)?.id;
    
    return mainMenuItems.filter(item => {
      const catName = (item.category_name || '').toLowerCase();
      const name = (item.name || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      
      return catName.includes(tag) || 
             (tagId && (item as any).category_id === tagId) ||
             name.includes(tag) ||
             desc.includes(tag);
    });
  }, [mainMenuItems, activeTag, apiTags]);

  const filteredRestaurants = useMemo(() => {
    if (!activeTag || activeTag === 'All') return restaurants.slice(0, 8);
    const tag = activeTag.toLowerCase();
    
    return restaurants.filter(r => {
      const cuisines = (r.cuisine_type || []).map(c => c.toLowerCase());
      const name = (r.name || '').toLowerCase();
      const desc = (r.description || '').toLowerCase();
      
      return cuisines.some(c => c.includes(tag)) || 
             name.includes(tag) || 
             desc.includes(tag);
    }).slice(0, 8);
  }, [restaurants, activeTag]);

  const orderAgainItems = useMemo(() => {
    return [...filteredMenuItems]
      .sort((a, b) => (b.restaurant_rating ?? 0) - (a.restaurant_rating ?? 0))
      .slice(0, 6);
  }, [filteredMenuItems]);

  const discoverMoreItems = useMemo(() => {
    return [...filteredMenuItems]
      .sort((a, b) => (a.delivery_fee ?? 0) - (b.delivery_fee ?? 0))
      .slice(0, 6);
  }, [filteredMenuItems]);

  const visibleFoodItems = useMemo(() => filteredMenuItems.slice(0, visibleFoodCount), [filteredMenuItems, visibleFoodCount]);

  const scrollViewRef = useRef<any>(null);
  const [showTopButton, setShowTopButton] = useState(false);

  const handleHomeScroll = ({ nativeEvent }: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    setShowTopButton(contentOffset.y > 300);
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 300;
    
    if (!isNearBottom || isLoadingMoreFood) return;
    
    if (visibleFoodCount < mainMenuItems.length) {
      setIsLoadingMoreFood(true);
      setTimeout(() => {
        setVisibleFoodCount(prev => prev + 6);
        setIsLoadingMoreFood(false);
      }, 500);
    }
  };

  const stickyIndices = [1];

  useEffect(() => {
    let isActive = true;
    const fetchAddress = async () => {
      if (!isAuthenticated) {
        if (isActive) {
          setAddress('GUEST ACCOUNT');
          setAddressSubtitle('Sign in to set location');
        }
        return;
      }
      try {
        const result = await api.getAddresses();
        const addrs = extractArray(result);
        if (isActive) setSavedAddresses(addrs);
        const defaultAddr = addrs.find((a: any) => a.is_default) || addrs[0];
        if (isActive) {
          if (defaultAddr) {
            const displayStreet = defaultAddr.street_address || defaultAddr.city || 'Saved Address';
            setAddress(displayStreet.toUpperCase());
            setAddressSubtitle(`${defaultAddr.city}${defaultAddr.state ? `, ${defaultAddr.state}` : ''}`);
          } else {
            setAddress('SET YOUR LOCATION');
            setAddressSubtitle('Tap to add address');
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch address:', err);
        if (isActive) {
          // Graceful handling for 404/Empty
          if (err?.message?.includes('404')) {
            setAddress('SET YOUR LOCATION');
            setAddressSubtitle('Tap to add address');
          } else {
            setAddress('LOCATION UNAVAILABLE');
            setAddressSubtitle('Check your connection');
          }
        }
      }
    };
    fetchAddress();
    return () => { isActive = false; };
  }, [isAuthenticated, refreshTrigger]);

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />
      {/* Status Bar Background - pointerEvents="none" to prevent blocking header touches */}
      <View pointerEvents="none" className="absolute top-0 left-0 right-0 bg-violet-600" style={{ height: 100 }} /> 
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <View className="flex-1 bg-white">
        {/* Static Header Section */}
        <Pressable 
          onPress={() => openPanel('address')}
          className="bg-violet-600 px-6 pb-2 pt-2">
          <View className="items-center">
            <View className="w-full flex-row items-center justify-center">
              <FontAwesome name="map-marker" size={15} color="#FFFFFF" />
              {address === 'Loading address...' ? (
                <View className="ml-2 py-1">
                  <ShimmerBox width={150} height={18} borderRadius={4} style={{ backgroundColor: '#A78BFA' }} />
                </View>
              ) : (
                <Text className="ml-2 text-center font-inter-bold text-[17px] uppercase tracking-[0.5px] text-white" numberOfLines={1}>
                  {address}
                </Text>
              )}
            </View>
            {address === 'Loading address...' ? (
              <View className="mt-1">
                <ShimmerBox width={100} height={12} borderRadius={4} style={{ backgroundColor: '#A78BFA' }} />
              </View>
            ) : (
              <Text className="mt-1 text-center font-inter-light text-sm text-violet-200" numberOfLines={1}>
                {addressSubtitle}
              </Text>
            )}
          </View>
        </Pressable>

        <View className="bg-white" style={{ zIndex: 20, elevation: 4 }}>
          <View className="bg-violet-600 px-6 pb-3 pt-2">
            <View className="h-11 flex-row items-center" style={{ gap: 8 }}>
              <Pressable
                onPress={() => router.push('/(tabs)/search')}
                className="h-11 flex-1 flex-row items-center rounded-2xl border border-violet-200 bg-white px-3">
                <FontAwesome name="search" size={16} color="#7C3AED" />
                <Text className="ml-3 flex-1 font-inter-light text-base text-violet-400">
                  Search food, stores, dishes...
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/cart')}
                className="h-11 w-11 items-center justify-center rounded-2xl bg-white"
                style={{ position: 'relative' }}>
                <FontAwesome name="shopping-basket" size={18} color="#7C3AED" />
                {cartCount > 0 && (
                  <View className="absolute top-1.5 right-1.5 h-4 w-4 items-center justify-center rounded-full bg-red-500">
                    <Text className="font-inter-bold text-[9px] text-white">{cartCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          <View className="bg-white px-4 pb-3 pt-1 border-b border-violet-50">
            <ScrollView
              horizontal
              disableScrollViewPanResponder
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}>
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

              <Pressable
                onPress={() => openPanel('sort')}
                className={`mr-2 h-9 flex-row items-center rounded-full border px-3 ${
                  selectedSort !== SORT_OPTIONS[0] ? 'border-violet-600 bg-violet-50' : 'border-violet-300 bg-white'
                }`}>
                <Text className="font-inter-bold text-[10px] uppercase text-violet-500">Sort </Text>
                <Text className="font-inter-semibold text-xs text-violet-900">{selectedSort}</Text>
              </Pressable>

              <Pressable
                onPress={() => openPanel('offers')}
                className={`mr-2 h-9 flex-row items-center rounded-full border px-3 ${
                  selectedOffer !== OFFER_OPTIONS[0] ? 'border-violet-600 bg-violet-50' : 'border-violet-300 bg-white'
                }`}>
                <Text className="font-inter-bold text-[10px] uppercase text-violet-500">Offers </Text>
                <Text className="font-inter-semibold text-xs text-violet-900">{selectedOffer}</Text>
              </Pressable>

              <View className="mr-2 w-px self-stretch bg-violet-100" />

              {(apiTags.length > 0 ? apiTags : FALLBACK_TAGS.map((name, i) => ({ id: String(i), name }))).map((tag) => (
                <Pressable
                  key={tag.id}
                  onPress={() => setActiveTag(tag.name === 'All' ? null : tag.name)}
                  className={`mr-2 h-9 items-center justify-center rounded-full border px-3 ${
                    (activeTag === tag.name || (activeTag === null && tag.name === 'All'))
                      ? 'border-violet-600 bg-violet-600'
                      : 'border-violet-200 bg-violet-50'
                  }`}>
                  <Text
                    className={`text-center font-inter text-xs ${
                      (activeTag === tag.name || (activeTag === null && tag.name === 'All')) ? 'font-inter-bold text-white' : 'text-violet-700'
                    }`}>
                    {tag.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 12 }}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          onScroll={handleHomeScroll}
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


          <View className="mb-6 px-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 2 }}
              snapToAlignment="center"
              decelerationRate="fast">
              {isLoadingMainMenu
                ? [0, 1].map((i) => <FeaturedCardSkeleton key={i} cardWidth={width - 42} />)
                  : filteredRestaurants.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => router.push(`/restaurant/${item.id}` as any)}
                      style={{ width: width - 42 }}
                      className="mr-3 h-[290px] overflow-hidden rounded-3xl">
                      <View className="absolute inset-0 bg-gray-50" />
                      {item.cover_image_url || item.logo_url ? (
                        <Image
                          source={{ uri: item.cover_image_url ?? item.logo_url ?? undefined }}
                          contentFit="cover"
                          style={{ height: '100%', width: '100%' }}
                        />
                      ) : (
                        <View className="h-full w-full bg-violet-500 items-center justify-center">
                          <FontAwesome name="image" size={48} color="#A78BFA" />
                        </View>
                      )}
                      
                      {/* Gradient Overlay */}
                      <View className="absolute bottom-0 left-0 right-0 h-32 justify-end p-5 bg-black/40">
                        <Text className="font-inter-extrabold text-3xl text-white shadow-sm shadow-black/50">{item.name}</Text>
                        <Text className="mt-1 font-inter-bold text-sm text-violet-100 shadow-sm shadow-black/50">
                          {item.cuisine_type?.join(', ') || 'Discover new flavors'}
                        </Text>
                      </View>

                      {/* Favorite Button */}
                      <Pressable 
                        onPress={() => toggleFavorite(item.id, undefined)}
                        className="absolute right-4 top-4 h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg z-10">
                        <FontAwesome name={favorites.has(item.id) ? 'heart' : 'heart-o'} size={18} color={favorites.has(item.id) ? '#EF4444' : '#7C3AED'} />
                      </Pressable>
                    </Pressable>
                  ))}
            </ScrollView>
          </View>

          <View className="px-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View>
                <Text className="font-inter-bold text-xl text-violet-900">Recommended for you</Text>
                <Text className="font-inter-light text-sm text-violet-500">Based on your activity</Text>
              </View>
              <Pressable
                onPress={() => router.push({ pathname: '/order-again', params: { mode: 'top-rated' } })}
                className="h-10 w-10 items-center justify-center rounded-full bg-violet-600">
                <FontAwesome name="chevron-right" size={14} color="#FFFFFF" />
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {isLoadingMainMenu
                ? [0, 1, 2].map((i) => <HorizontalCardSkeleton key={i} />)
                : filteredMenuItems.map((item: any) => (
                    <Pressable 
                      key={item.id} 
                      onPress={() => item.restaurant_id ? router.push(`/restaurant/${item.restaurant_id}` as any) : null}
                      className="mr-3 w-72 rounded-3xl border border-violet-200 bg-white p-3">
                      {item.image_url ? (
                        <View className="relative">
                          <Image source={{ uri: item.image_url }} contentFit="cover" style={{ height: 112, width: '100%', borderRadius: 16 }} />
                          <Pressable 
                            onPress={() => toggleFavorite(undefined, item.id)}
                            className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm">
                            <FontAwesome name={favorites.has(item.id) ? 'heart' : 'heart-o'} size={12} color={favorites.has(item.id) ? '#EF4444' : '#7C3AED'} />
                          </Pressable>
                        </View>
                      ) : (
                        <View className="relative">
                          <View className="h-28 rounded-2xl bg-violet-100 items-center justify-center">
                            <FontAwesome name="cutlery" size={24} color="#DDD6FE" />
                          </View>
                          <Pressable 
                            onPress={() => toggleFavorite(undefined, item.id)}
                            className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                            <FontAwesome name={favorites.has(item.id) ? 'heart' : 'heart-o'} size={12} color={favorites.has(item.id) ? '#EF4444' : '#7C3AED'} />
                          </Pressable>
                        </View>
                      )}
                      <Text className="mt-3 font-inter-bold text-base text-violet-900">{item.name}</Text>
                      <Text className="mt-1 font-inter-light text-sm text-violet-500">
                        {item.restaurant_name}  •  Delivery{' '}
                        {item.delivery_fee ? `P${item.delivery_fee}` : 'N/A'}  •  {formatPrice(item.price)}
                      </Text>
                    </Pressable>
                  ))}
            </ScrollView>

            <View className="mb-3 mt-6 flex-row items-center justify-between">
              <View>
                <Text className="font-inter-bold text-xl text-violet-900">Discover more</Text>
                <Text className="font-inter-light text-sm text-violet-500">Exciting new flavors to try</Text>
              </View>
              <Pressable
                onPress={() => router.push({ pathname: '/order-again', params: { mode: 'discover' } })}
                className="h-10 w-10 items-center justify-center rounded-full bg-violet-600">
                <FontAwesome name="chevron-right" size={14} color="#FFFFFF" />
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {isLoadingMainMenu
                ? [0, 1, 2].map((i) => <HorizontalCardSkeleton key={i} />)
                : discoverMoreItems.map((item: any) => (
                    <Pressable 
                      key={item.id} 
                      onPress={() => item.restaurant_id ? router.push(`/restaurant/${item.restaurant_id}` as any) : null}
                      className="mr-3 w-72 rounded-3xl border border-violet-200 bg-white p-3">
                      {item.image_url ? (
                        <View className="relative">
                          <Image source={{ uri: item.image_url }} contentFit="cover" style={{ height: 112, width: '100%', borderRadius: 16 }} />
                          <Pressable 
                            onPress={() => toggleFavorite(undefined, item.id)}
                            className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm">
                            <FontAwesome name={favorites.has(item.id) ? 'heart' : 'heart-o'} size={12} color={favorites.has(item.id) ? '#EF4444' : '#7C3AED'} />
                          </Pressable>
                        </View>
                      ) : (
                        <View className="relative">
                          <View className="h-28 rounded-2xl bg-violet-100 items-center justify-center">
                            <FontAwesome name="cutlery" size={24} color="#DDD6FE" />
                          </View>
                          <Pressable 
                            onPress={() => toggleFavorite(undefined, item.id)}
                            className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                            <FontAwesome name={favorites.has(item.id) ? 'heart' : 'heart-o'} size={12} color={favorites.has(item.id) ? '#EF4444' : '#7C3AED'} />
                          </Pressable>
                        </View>
                      )}
                      <Text className="mt-3 font-inter-bold text-base text-violet-900">{item.name}</Text>
                      <Text className="mt-1 font-inter-light text-sm text-violet-500">
                        {item.restaurant_name ?? 'Restaurant'}  •  Delivery{' '}
                        {item.delivery_fee ? `P${item.delivery_fee}` : 'N/A'}
                      </Text>
                    </Pressable>
                  ))}
            </ScrollView>

            <View className="mb-3 mt-8 flex-row items-center justify-between">
              <View>
                <Text className="font-inter-bold text-xl text-violet-900">Food Feed</Text>
                <Text className="font-inter-light text-sm text-violet-500">Fresh dishes right now</Text>
              </View>
            </View>

            {isLoadingMainMenu ? (
              <View>
                {[0, 1, 2].map((i) => <FeedCardSkeleton key={i} />)}
              </View>
            ) : mainMenuError ? (
              <View className="rounded-3xl border border-rose-200 bg-rose-50 p-4">
                <Text className="font-inter text-sm text-rose-700">{mainMenuError}</Text>
              </View>
            ) : visibleFoodItems.length === 0 ? (
              <View className="rounded-3xl border border-violet-200 bg-white p-4">
                <Text className="font-inter-bold text-base text-violet-900">No food items found</Text>
                <Text className="mt-1 font-inter-light text-sm text-violet-500">
                  Try a different tag, search keyword, or offer filter.
                </Text>
              </View>
            ) : (
              <View>
                {visibleFoodItems.map((item: any) => (
                  <Pressable 
                    key={item.id} 
                    onPress={() => item.restaurant_id ? router.push(`/restaurant/${item.restaurant_id}` as any) : null}
                    className="mb-3 rounded-3xl border border-violet-200 bg-white p-3">
                    <View className="relative">
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} contentFit="cover" style={{ height: 180, width: '100%', borderRadius: 16 }} />
                      ) : (
                        <View className="h-[180px] rounded-2xl bg-violet-100" />
                      )}
                      <Pressable 
                        onPress={() => toggleFavorite(undefined, item.id)}
                        className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-white shadow-md">
                        <FontAwesome name={favorites.has(item.id) ? 'heart' : 'heart-o'} size={16} color={favorites.has(item.id) ? '#EF4444' : '#7C3AED'} />
                      </Pressable>
                    </View>
                    <Text className="mt-3 font-inter-bold text-base text-violet-900">{item.name}</Text>
                    {!!item.restaurant_name && (
                      <Text className="mt-1 font-inter text-xs text-violet-500">{item.restaurant_name}</Text>
                    )}
                    {!!item.description && (
                      <Text numberOfLines={2} className="mt-1 font-inter-light text-sm text-violet-500">
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
                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="font-inter-light text-xs text-violet-600">
                        Delivery {item.delivery_fee ? `P${item.delivery_fee}` : 'N/A'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
                {isLoadingMoreFood && (
                  <View className="mb-3 items-center">
                    <Text className="font-inter-light text-xs text-violet-500">Loading more food items...</Text>
                  </View>
                )}
                {!isLoadingMoreFood && visibleFoodCount < mainMenuItems.length && (
                  <View className="mb-4 items-center">
                    <Text className="font-inter-light text-xs text-violet-500">Scroll down to load more</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <Modal visible={panelVisible} transparent animationType="none" onRequestClose={closePanel}>
        <View className="flex-1 justify-end">
          <Pressable onPress={closePanel} className="absolute bottom-0 left-0 right-0 top-0 bg-black/55" />

          <Animated.View
            style={{
              transform: [{ translateY: panelTranslateY }],
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: panelHeight,
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              overflow: 'hidden',
            }}
            className="">
            <View style={{ flex: 1, height: '100%' }} className="px-4 pb-4 pt-3">
              <View className="items-center pb-2" {...sheetPanResponder.panHandlers}>
                <View className="h-1.5 w-12 rounded-full bg-violet-200" />
              </View>

              <View className="mb-2 flex-row items-center justify-between px-1" {...sheetPanResponder.panHandlers}>
                <View>
                  <Text className="font-inter-bold text-xl text-violet-900">
                    {activePanel === 'address' ? (isAddingAddress ? 'Add Address' : 'Your Location') : sheetTitle}
                  </Text>
                  <Text className="mt-0.5 font-inter-light text-xs text-violet-500">
                    {activePanel === 'address' ? (isAddingAddress ? 'Enter delivery details' : 'Choose a delivery address') : 'Choose one option'}
                  </Text>
                </View>
                <Pressable onPress={closePanel} className="h-10 w-10 items-center justify-center rounded-full bg-violet-50">
                  <FontAwesome name="times" size={16} color="#7C3AED" />
                </Pressable>
              </View>

              <View className="mb-3 flex-1">
                {activePanel === 'address' ? (
                  isAddingAddress ? (
                    <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                      <View className="mt-4 gap-4">
                        <View className="h-[56px] w-full rounded-2xl border border-violet-200 px-4">
                          <View className="h-full flex-row items-center">
                            <FontAwesome name="tag" size={18} color="#7C3AED" />
                            <TextInput
                              value={addressForm.label}
                              onChangeText={v => setAddressForm(p => ({ ...p, label: v }))}
                              placeholder="Label (e.g. Home, Work)"
                              className="ml-3 flex-1 font-inter-light text-base text-violet-900"
                            />
                          </View>
                        </View>
                        <View className="h-[56px] w-full rounded-2xl border border-violet-200 px-4">
                          <View className="h-full flex-row items-center">
                            <FontAwesome name="map-marker" size={18} color="#7C3AED" />
                            <TextInput
                              value={addressForm.street_address}
                              onChangeText={v => setAddressForm(p => ({ ...p, street_address: v }))}
                              placeholder="Street Address"
                              className="ml-3 flex-1 font-inter-light text-base text-violet-900"
                            />
                          </View>
                        </View>
                        
                        <Pressable 
                          onPress={() => setShowProvinceOptions(!showProvinceOptions)}
                          className="h-[56px] w-full flex-row items-center justify-between rounded-2xl border border-violet-200 px-4">
                          <View className="flex-row items-center">
                            <FontAwesome name="globe" size={18} color="#7C3AED" />
                            <Text className={`ml-3 font-inter-light text-base ${addressForm.state ? 'text-violet-900' : 'text-violet-400'}`}>
                              {addressForm.state || 'Select Province'}
                            </Text>
                          </View>
                          <FontAwesome name={showProvinceOptions ? 'chevron-up' : 'chevron-down'} size={14} color="#7C3AED" />
                        </Pressable>
                        {showProvinceOptions && (
                          <View className="max-h-60 rounded-2xl border border-violet-100 bg-violet-50/30">
                            <ScrollView nestedScrollEnabled className="p-2">
                              {provinceGrouped.map(group => (
                                <View key={group.letter}>
                                  <Text className="px-3 py-2 font-inter-bold text-[10px] uppercase text-violet-400">{group.letter}</Text>
                                  {group.values.map(p => (
                                    <Pressable 
                                      key={p} 
                                      onPress={() => {
                                        setAddressForm(prev => ({ ...prev, state: p, city: '' }));
                                        setShowProvinceOptions(false);
                                      }}
                                      className="py-3 px-3">
                                      <Text className="font-inter text-sm text-violet-900">{p}</Text>
                                    </Pressable>
                                  ))}
                                </View>
                              ))}
                            </ScrollView>
                          </View>
                        )}

                        <Pressable 
                          onPress={() => addressForm.state && setShowCityOptions(!showCityOptions)}
                          className={`h-[56px] w-full flex-row items-center justify-between rounded-2xl border px-4 ${addressForm.state ? 'border-violet-200' : 'border-gray-100 bg-gray-50'}`}>
                          <View className="flex-row items-center">
                            <FontAwesome name="building" size={18} color={addressForm.state ? '#7C3AED' : '#D1D5DB'} />
                            <Text className={`ml-3 font-inter-light text-base ${addressForm.city ? 'text-violet-900' : 'text-violet-400'}`}>
                              {addressForm.city || 'Select City'}
                            </Text>
                          </View>
                          <FontAwesome name={showCityOptions ? 'chevron-up' : 'chevron-down'} size={14} color="#7C3AED" />
                        </Pressable>
                        {showCityOptions && (
                          <View className="max-h-60 rounded-2xl border border-violet-100 bg-violet-50/30">
                            <ScrollView nestedScrollEnabled className="p-2">
                              {cityGrouped.map(group => (
                                <View key={group.letter}>
                                  <Text className="px-3 py-2 font-inter-bold text-[10px] uppercase text-violet-400">{group.letter}</Text>
                                  {group.values.map(c => (
                                    <Pressable 
                                      key={c} 
                                      onPress={() => {
                                        setAddressForm(prev => ({ ...prev, city: c }));
                                        setShowCityOptions(false);
                                      }}
                                      className="py-3 px-3">
                                      <Text className="font-inter text-sm text-violet-900">{c}</Text>
                                    </Pressable>
                                  ))}
                                </View>
                              ))}
                            </ScrollView>
                          </View>
                        )}

                        <View className="h-[56px] w-full rounded-2xl border border-violet-200 px-4">
                          <View className="h-full flex-row items-center">
                            <FontAwesome name="envelope" size={18} color="#7C3AED" />
                            <TextInput
                              value={addressForm.postal_code}
                              onChangeText={v => setAddressForm(p => ({ ...p, postal_code: v }))}
                              placeholder="ZIP / Postal Code"
                              keyboardType="numeric"
                              className="ml-3 flex-1 font-inter-light text-base text-violet-900"
                            />
                          </View>
                        </View>
                        
                        <Pressable onPress={handleSaveAddress} className="mt-2 h-14 w-full items-center justify-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-600/30">
                          <Text className="font-inter-bold text-lg text-white">Save Address</Text>
                        </Pressable>
                        <Pressable onPress={() => setIsAddingAddress(false)} className="mb-10 items-center justify-center py-2">
                          <Text className="font-inter-semibold text-sm text-violet-500">Back to saved addresses</Text>
                        </Pressable>
                      </View>
                    </ScrollView>
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                      <View className="mt-4">
                        {savedAddresses.length > 0 ? (
                          savedAddresses.map((addr) => (
                            <Pressable 
                              key={addr.id} 
                              onPress={() => onSelectAddress(addr)}
                              className={`mb-3 flex-row items-center rounded-2xl border p-4 ${addr.is_default ? 'border-violet-600 bg-violet-50' : 'border-violet-100 bg-white'}`}>
                              <View className={`h-10 w-10 items-center justify-center rounded-full ${addr.is_default ? 'bg-violet-600' : 'bg-violet-100'}`}>
                                <FontAwesome name={addr.label?.toLowerCase() === 'work' ? 'briefcase' : 'home'} size={18} color={addr.is_default ? '#FFFFFF' : '#7C3AED'} />
                              </View>
                              <View className="ml-4 flex-1">
                                <View className="flex-row items-center justify-between">
                                  <Text className={`font-inter-bold text-base ${addr.is_default ? 'text-violet-900' : 'text-gray-900'}`}>{addr.label || 'Home'}</Text>
                                  {addr.is_default && (
                                    <View className="rounded-full bg-violet-600 px-2 py-0.5">
                                      <Text className="font-inter-bold text-[10px] text-white">DEFAULT</Text>
                                    </View>
                                  )}
                                </View>
                                <Text className="font-inter-light text-sm text-gray-500">{addr.street_address}</Text>
                                <Text className="font-inter-light text-xs text-gray-400">{addr.city}{addr.state ? `, ${addr.state}` : ''}</Text>
                              </View>
                            </Pressable>
                          ))
                        ) : (
                          <View className="my-10 items-center justify-center">
                            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-violet-50">
                              <FontAwesome name="map-o" size={32} color="#DDD6FE" />
                            </View>
                            <Text className="font-inter-bold text-lg text-violet-900">No addresses saved</Text>
                            <Text className="mt-1 font-inter-light text-sm text-violet-500">Add an address to see stores near you</Text>
                          </View>
                        )}
                        <Pressable 
                          onPress={() => setIsAddingAddress(true)}
                          className="mt-2 h-14 w-full flex-row items-center justify-center rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/50">
                          <FontAwesome name="plus" size={16} color="#7C3AED" className="mr-2" />
                          <Text className="ml-2 font-inter-bold text-base text-violet-700">Add New Address</Text>
                        </Pressable>
                      </View>
                    </ScrollView>
                  )
                ) : (
                  <ScrollView
                    style={{ flex: 1, minHeight: 0 }}
                    contentContainerStyle={{ paddingBottom: 4, paddingHorizontal: 2 }}
                    showsVerticalScrollIndicator={false}>
                    {sheetOptions.map((option) => {
                      const active = draftSelection === option;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => onSelectOption(option)}
                          className={`mb-2 min-h-[52px] flex-row items-center rounded-xl border px-3 ${
                            active ? 'border-violet-600 bg-violet-50' : 'border-violet-200 bg-white'
                          }`}>
                          <View
                            className={`mr-3 h-5 w-5 items-center justify-center rounded-full border-2 ${
                              active ? 'border-violet-700 bg-violet-100' : 'border-violet-500 bg-white'
                            }`}>
                            {active && <View className="h-2.5 w-2.5 rounded-full bg-violet-700" />}
                          </View>
                          <Text
                            style={{ textAlignVertical: 'center', includeFontPadding: false }}
                            className={`flex-1 font-inter text-base ${
                              active ? 'font-inter-bold text-violet-800' : 'text-violet-900'
                            }`}>
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {activePanel !== 'address' && (
                <View className="mx-1 mb-1 flex-row">
                  <Pressable onPress={resetPanel} className="mr-2 h-10 flex-1 items-center justify-center rounded-xl border border-violet-200 bg-white">
                    <Text className="font-inter-bold text-sm text-violet-700">Reset</Text>
                  </Pressable>
                  <Pressable onPress={applyPanel} className="ml-2 h-10 flex-1 items-center justify-center rounded-xl bg-violet-600">
                    <Text className="font-inter-bold text-sm text-white">Apply</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Scroll-to-top chevron — shown after scrolling, near tab bar */}
      {showTopButton && (
        <Pressable 
          onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
          style={{ bottom: hasActiveOrder ? 92 : 20, right: 16 }}
          className="absolute h-11 w-11 items-center justify-center rounded-full bg-violet-600 shadow-lg shadow-violet-900/30">
          <FontAwesome name="chevron-up" size={15} color="white" />
        </Pressable>
      )}

        </SafeAreaView>
      </View>
    );
}


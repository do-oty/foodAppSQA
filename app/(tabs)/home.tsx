import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, PanResponder, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const popularTags = ['Burger', 'Milktea', 'Pizza', 'Sushi', 'Pasta', 'Sisig', 'Halo-halo'];

const bestSellers = [
  { title: 'Combo Saver', subtitle: 'Meals from P99', badge: 'HOT' },
  { title: 'Cheesy Meal', subtitle: 'Cheese lover picks', badge: 'TRENDING' },
  { title: 'Family Feast', subtitle: 'Shareable bundles', badge: 'SAVE BIG' },
  { title: 'Party Bucket', subtitle: 'Perfect for groups', badge: 'LIMITED' },
  { title: 'Hot Deal', subtitle: 'Flash promos now', badge: 'NEW' },
];

const orderAgainItems = [
  { title: 'Chicken Inasal', rating: '4.8', fee: 'P39', promo: '20% OFF' },
  { title: 'Beef Tapa Bowl', rating: '4.7', fee: 'P49', promo: 'Free Drink' },
  { title: 'Spicy Ramen Set', rating: '4.9', fee: 'P59', promo: 'Buy 1 Take 1' },
];

const discoverMoreItems = [
  { title: 'Street Tacos', rating: '4.6', fee: 'P45', promo: 'New Store' },
  { title: 'Korean BBQ Box', rating: '4.8', fee: 'P59', promo: '15% OFF' },
  { title: 'Boba Bundle', rating: '4.7', fee: 'P29', promo: '2x Points' },
];

type PanelType = 'filter' | 'sort' | 'offers' | null;

const FILTER_OPTIONS = ['All', 'Fast Delivery', 'Top Rated', 'Near Me'];
const SORT_OPTIONS = ['Best Match', 'Top Rated', 'Delivery Fee Low to High', 'Fastest Delivery'];
const OFFER_OPTIONS = ['Any Offer', 'Free Delivery', '50% Off', 'Buy 1 Take 1'];
const QUICK_PILLS = ['Price', 'Delivery Fee', 'Distance', 'Open Now', 'Rating 4.5+', 'Promo', 'Pickup', 'New Stores'];

export default function HomeTabScreen() {
  const router = useRouter();
  const { width } = Dimensions.get('window');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(FILTER_OPTIONS[0]);
  const [selectedSort, setSelectedSort] = useState(SORT_OPTIONS[0]);
  const [selectedOffer, setSelectedOffer] = useState(OFFER_OPTIONS[0]);
  const [selectedQuickPills, setSelectedQuickPills] = useState<string[]>([]);
  const [draftSelection, setDraftSelection] = useState('');
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
      useNativeDriver: true,
    }).start();
  };

  const closePanel = () => {
    Animated.timing(panelTranslateY, {
      toValue: 420,
      duration: 220,
      useNativeDriver: true,
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
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.timing(panelTranslateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
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

  const stickyIndices = [1];

  return (
    <SafeAreaView className="flex-1 bg-violet-600" edges={['top', 'left', 'right']}>
      <View className="flex-1 bg-white">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          stickyHeaderIndices={stickyIndices}>
          <View className="bg-violet-600 px-3 pb-2 pt-2">
            <View className="items-center">
              <View className="w-full flex-row items-center justify-center">
                <FontAwesome name="map-marker" size={15} color="#FFFFFF" />
                <Text className="ml-2 text-center font-inter-bold text-[17px] uppercase tracking-[0.5px] text-white">
                  123 SAMPLE ST., BRGY. FOODHUB
                </Text>
              </View>
              <Text className="mt-1 text-center font-inter-light text-sm text-violet-200">Quezon City, Metro Manila</Text>
            </View>
          </View>

          <View className="bg-white" style={{ zIndex: 20, elevation: 0, shadowOpacity: 0, shadowRadius: 0 }}>
            <View className="bg-violet-600 px-3 pb-3 pt-2" style={{ zIndex: 20, elevation: 0, shadowOpacity: 0, shadowRadius: 0 }}>
              <View className="h-11 flex-row items-center rounded-2xl border border-violet-200 bg-white px-3">
                <FontAwesome name="search" size={16} color="#7C3AED" />
                <Text className="ml-3 font-inter-light text-base text-violet-400">Search food, stores, dishes...</Text>
              </View>
            </View>

            {!!activeTag && (
              <View className="bg-white px-4 pb-3 pt-1">
                <ScrollView
                  horizontal
                  disableScrollViewPanResponder
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsHorizontalScrollIndicator={false}>
                  <Pressable
                    onPress={() => openPanel('filter')}
                    className="mr-2 h-9 w-9 items-center justify-center rounded-full border border-violet-200 bg-white">
                    <FontAwesome name="sliders" size={12} color="#475569" />
                  </Pressable>
                  <Pressable
                    onPress={() => openPanel('sort')}
                    className="mr-2 h-9 flex-row items-center rounded-full border border-violet-300 bg-white px-3">
                    <Text className="font-inter-bold text-[10px] uppercase text-violet-500">Sort </Text>
                    <Text className="font-inter-semibold text-xs text-violet-900">{selectedSort}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openPanel('offers')}
                    className="mr-2 h-9 flex-row items-center rounded-full border border-violet-300 bg-white px-3">
                    <Text className="font-inter-bold text-[10px] uppercase text-violet-500">Offers </Text>
                    <Text className="font-inter-semibold text-xs text-violet-900">{selectedOffer}</Text>
                  </Pressable>
                  {QUICK_PILLS.map((pill) => (
                    <Pressable
                      key={pill}
                      onPress={() => toggleQuickPill(pill)}
                      className={`mr-2 h-9 items-center justify-center rounded-full border px-3 ${
                        selectedQuickPills.includes(pill)
                          ? 'border-violet-600 bg-violet-600'
                          : 'border-violet-200 bg-violet-50'
                      }`}>
                      <Text
                        className={`text-center font-inter text-xs ${
                          selectedQuickPills.includes(pill) ? 'font-inter-bold text-white' : 'text-violet-700'
                        }`}>
                        {pill}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View className="mb-2 px-4 pt-1">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {popularTags.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => setActiveTag((prev) => (prev === tag ? null : tag))}
                  className={`mr-2 rounded-full border px-4 py-2 ${
                    activeTag === tag ? 'border-violet-600 bg-violet-600' : 'border-violet-200 bg-violet-50'
                  }`}>
                  <Text className={`text-center font-inter text-sm ${activeTag === tag ? 'text-white' : 'text-violet-700'}`}>
                    {tag}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View className="mb-6 px-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 2 }}
              snapToAlignment="center"
              decelerationRate="fast">
              {bestSellers.map((item) => (
                <View
                  key={item.title}
                  style={{ width: width - 42 }}
                  className="mr-3 h-[290px] rounded-3xl bg-violet-600 p-5">
                  <View className="h-full justify-between">
                    <View className="items-start">
                      <View className="rounded-full bg-white px-3 py-1">
                        <Text className="font-inter-bold text-[10px] uppercase text-violet-700">{item.badge}</Text>
                      </View>
                      <Text className="mt-3 font-inter-extrabold text-4xl text-white">{item.title}</Text>
                      <Text className="mt-2 font-inter-light text-base text-violet-100">{item.subtitle}</Text>
                    </View>

                    <View className="h-28 rounded-2xl bg-violet-500" />
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          <View className="px-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View>
                <Text className="font-inter-bold text-xl text-violet-900">Order again</Text>
                <Text className="font-inter-light text-sm text-violet-500">Based on your recent orders</Text>
              </View>
              <Pressable
                onPress={() => router.push('/order-again')}
                className="h-10 w-10 items-center justify-center rounded-full bg-violet-600">
                <FontAwesome name="angle-right" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {orderAgainItems.map((item) => (
                <View key={item.title} className="mr-3 w-72 rounded-3xl border border-violet-200 bg-white p-3">
                  <View className="h-28 rounded-2xl bg-violet-100" />
                  <Text className="mt-3 font-inter-bold text-base text-violet-900">{item.title}</Text>
                  <Text className="mt-1 font-inter-light text-sm text-violet-500">
                  <FontAwesome name="star" size={15} color="#FFD700" /> {item.rating}  •  Delivery {item.fee}  •  {item.promo}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View className="mb-3 mt-6 flex-row items-center justify-between">
              <View>
                <Text className="font-inter-bold text-xl text-violet-900">Discover more</Text>
                <Text className="font-inter-light text-sm text-violet-500">Recommended for you</Text>
              </View>
              <Pressable
                onPress={() => router.push('/order-again')}
                className="h-10 w-10 items-center justify-center rounded-full bg-violet-600">
                <FontAwesome name="angle-right" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {discoverMoreItems.map((item) => (
                <View key={item.title} className="mr-3 w-72 rounded-3xl border border-violet-200 bg-white p-3">
                  <View className="h-28 rounded-2xl bg-violet-100" />
                  <Text className="mt-3 font-inter-bold text-base text-violet-900">{item.title}</Text>
                  <Text className="mt-1 font-inter-light text-sm text-violet-500">
                  <FontAwesome name="star" size={15} color="#FFD700" /> {item.rating}  •  Delivery {item.fee}  •  {item.promo}
                  </Text>
                </View>
              ))}
            </ScrollView>
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
                  <Text className="font-inter-bold text-xl text-violet-900">{sheetTitle}</Text>
                  <Text className="mt-0.5 font-inter-light text-xs text-violet-500">Choose one option</Text>
                </View>
                <Pressable onPress={closePanel} className="items-center justify-center px-1 py-1">
                  <Text className="font-inter-bold text-base text-violet-700">X</Text>
                </Pressable>
              </View>

              <View className="mb-3 flex-1">
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
              </View>

              <View className="mx-1 mb-1 flex-row">
                <Pressable onPress={resetPanel} className="mr-2 h-10 flex-1 items-center justify-center rounded-xl border border-violet-200 bg-white">
                  <Text className="font-inter-bold text-sm text-violet-700">Reset</Text>
                </Pressable>
                <Pressable onPress={applyPanel} className="ml-2 h-10 flex-1 items-center justify-center rounded-xl bg-violet-600">
                  <Text className="font-inter-bold text-sm text-white">Apply</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}


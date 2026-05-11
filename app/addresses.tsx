import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  Animated, 
  Modal, 
  PanResponder, 
  Pressable, 
  ScrollView, 
  Text, 
  TextInput, 
  View, 
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiAddress, extractArray } from '../services/api';
import { useAlert } from '../components/ui/custom-alert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Borrowing lists from signup-location.tsx logic
const provincesData = require('philippines/provinces.json') as { name: string; key: string }[];
const citiesData = require('philippines/cities.json') as { name: string; province: string }[];
const sortedProvinces = [...provincesData].sort((a, b) => a.name.localeCompare(b.name));

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

export default function SavedAddressesScreen() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showAlert } = useAlert();

  // New address form state
  const [label, setLabel] = useState('Home');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Form UI state
  const [showProvinceOptions, setShowProvinceOptions] = useState(false);
  const [showCityOptions, setShowCityOptions] = useState(false);

  // Animated state for bottom sheet
  const panelTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const loadAddresses = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Get current user to know our ID
      const userRes = await api.me();
      const currentUserId = userRes.data?.id;

      // 2. Get addresses
      const res = await api.getAddresses();
      if (res.success === false) {
        throw new Error(res.message || 'Failed to load addresses');
      }
      
      const allAddresses = extractArray(res);
      
      // 3. Filter client-side if the API is leaking other users' addresses
      if (currentUserId) {
        const myAddresses = allAddresses.filter((addr: any) => 
          addr.user_id === currentUserId || !addr.user_id
        );
        setAddresses(myAddresses);
      } else {
        setAddresses(allAddresses);
      }
    } catch (err: any) {
      console.error('Failed to load addresses:', err);
      showAlert({
        title: 'Error',
        message: err?.message || 'Could not fetch your saved addresses. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const openSheet = () => {
    setIsAdding(true);
    Animated.timing(panelTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(panelTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setIsAdding(false));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panelTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 1) {
          closeSheet();
        } else {
          Animated.timing(panelTranslateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleAddAddress = async () => {
    if (!streetAddress || !city || !state) {
      showAlert({ title: 'Error', message: 'Please fill in street, city, and state.', type: 'warning' });
      return;
    }
    setIsSubmitting(true);
    try {
      await api.createAddress({
        label,
        street_address: streetAddress,
        city,
        state,
        postal_code: postalCode,
        is_default: addresses.length === 0,
        latitude: 14.5995, // Default Manila lat
        longitude: 120.9842, // Default Manila lng
      });
      setStreetAddress('');
      setCity('');
      setState('');
      setPostalCode('');
      closeSheet();
      loadAddresses();
    } catch (err: any) {
      showAlert({ title: 'Error', message: err?.message || 'Failed to add address.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await api.setDefaultAddress(id);
      loadAddresses();
    } catch (err: any) {
      showAlert({ title: 'Error', message: err?.message || 'Failed to set default address.', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    showAlert({
      title: 'Delete Address',
      message: 'Are you sure you want to remove this address?',
      type: 'warning',
      showCancel: true,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await api.deleteAddress(id);
          loadAddresses();
        } catch (err: any) {
          showAlert({ title: 'Error', message: err?.message || 'Failed to delete address.', type: 'error' });
        }
      }
    });
  };

  const provinceList = sortedProvinces.map((p) => p.name);
  const provinceGrouped = buildGroupedByLetter(provinceList);
  const selectedProvinceKey = sortedProvinces.find((p) => p.name === state)?.key;
  const cityNamesRaw = selectedProvinceKey
    ? citiesData.filter((item) => item.province === selectedProvinceKey).map((item) => item.name)
    : [];
  const cityGrouped = buildGroupedByLetter(cityNamesRaw);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-50">
          <FontAwesome name="arrow-left" size={20} color="#9CA3AF" />
        </Pressable>
        <Text className="font-inter-bold text-lg text-violet-900">Saved Addresses</Text>
        <Pressable 
          onPress={openSheet}
          className="h-10 w-10 items-center justify-center rounded-full bg-violet-50">
          <FontAwesome name="plus" size={18} color="#7C3AED" />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4 pt-2">
        {isLoading ? (
          <View className="mt-20 items-center">
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : addresses.length === 0 ? (
          <View className="mt-20 items-center">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-violet-50 mb-6">
              <FontAwesome name="map-marker" size={40} color="#DDD6FE" />
            </View>
            <Text className="font-inter-bold text-xl text-violet-900">No addresses yet</Text>
            <Text className="mt-2 text-center font-inter-light text-sm text-violet-500">
              Add your delivery addresses to make ordering faster!
            </Text>
            <Pressable
              onPress={openSheet}
              className="mt-8 h-14 w-full items-center justify-center rounded-2xl bg-violet-600">
              <Text className="font-inter-bold text-base text-white">Add New Address</Text>
            </Pressable>
          </View>
        ) : (
          addresses.map((addr) => (
            <Pressable 
              key={addr.id}
              onPress={() => !addr.is_default && handleSetDefault(addr.id)}
              className={`mb-4 rounded-3xl border p-4 ${addr.is_default ? 'border-violet-600 bg-violet-50' : 'border-violet-100 bg-white shadow-sm shadow-violet-100/50'}`}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="font-inter-bold text-base text-violet-900">{addr.label || 'Address'}</Text>
                    {addr.is_default && (
                      <View className="ml-2 rounded-full bg-violet-600 px-2 py-0.5">
                        <Text className="font-inter-bold text-[10px] text-white">DEFAULT</Text>
                      </View>
                    )}
                  </View>
                  <Text className="mt-1 font-inter-light text-sm text-violet-700">{addr.street_address}</Text>
                  <Text className="font-inter-light text-sm text-violet-500">
                    {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postal_code}
                  </Text>
                </View>
                <Pressable onPress={() => handleDelete(addr.id)} className="h-8 w-8 items-center justify-center rounded-full bg-red-50">
                  <FontAwesome name="trash-o" size={14} color="#EF4444" />
                </Pressable>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Add Address Bottom Sheet */}
      <Modal visible={isAdding} transparent animationType="none" onRequestClose={closeSheet}>
        <View className="flex-1 justify-end">
          <Pressable onPress={closeSheet} className="absolute inset-0 bg-black/55" />
          
          <Animated.View
            {...panResponder.panHandlers}
            style={{
              transform: [{ translateY: panelTranslateY }],
              height: SCREEN_HEIGHT * 0.85,
              backgroundColor: 'white',
              borderTopLeftRadius: 40,
              borderTopRightRadius: 40,
              overflow: 'hidden',
            }}>
            <View className="flex-1 p-6 pb-12">
              <View className="items-center mb-2">
                <View className="h-1.5 w-12 rounded-full bg-violet-100" />
              </View>

              <View className="flex-row items-center justify-between mb-6">
                <View>
                  <Text className="font-inter-bold text-2xl text-violet-900">New Address</Text>
                  <Text className="font-inter-light text-xs text-violet-500">Add a delivery location</Text>
                </View>
                <Pressable onPress={closeSheet} className="h-10 w-10 items-center justify-center rounded-full bg-violet-50">
                  <FontAwesome name="times" size={16} color="#7C3AED" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View className="gap-4">
                  {/* Label */}
                  <View>
                    <Text className="mb-2 font-inter-bold text-[10px] uppercase tracking-wider text-violet-400">Label (e.g. Home, Work)</Text>
                    <TextInput 
                      value={label}
                      onChangeText={setLabel}
                      placeholder="Home"
                      className="h-14 rounded-2xl bg-violet-50/50 px-4 font-inter text-violet-900 border border-violet-100"
                    />
                  </View>

                  {/* Street */}
                  <View>
                    <Text className="mb-2 font-inter-bold text-[10px] uppercase tracking-wider text-violet-400">Street Address</Text>
                    <TextInput 
                      value={streetAddress}
                      onChangeText={setStreetAddress}
                      placeholder="123 Main St"
                      className="h-14 rounded-2xl bg-violet-50/50 px-4 font-inter text-violet-900 border border-violet-100"
                    />
                  </View>

                  {/* Province Collapsible */}
                  <View>
                    <Text className="mb-2 font-inter-bold text-[10px] uppercase tracking-wider text-violet-400">Province / State</Text>
                    <Pressable
                      onPress={() => {
                        setShowProvinceOptions(!showProvinceOptions);
                        setShowCityOptions(false);
                      }}
                      className={`h-14 flex-row items-center justify-between rounded-2xl border border-violet-100 bg-violet-50/50 px-4 ${showProvinceOptions ? 'rounded-b-none' : ''}`}>
                      <Text className={`font-inter text-base ${state ? 'text-violet-900' : 'text-violet-300'}`}>
                        {state || 'Select Province / State'}
                      </Text>
                      <FontAwesome name={showProvinceOptions ? 'chevron-up' : 'chevron-down'} size={12} color="#7C3AED" />
                    </Pressable>
                    {showProvinceOptions && (
                      <View className="max-h-60 rounded-b-2xl border border-t-0 border-violet-100 bg-white overflow-hidden">
                        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                          {provinceGrouped.map((group) => (
                            <View key={group.letter} className="px-4 py-2">
                              <Text className="font-inter-bold text-xs text-violet-300 mb-1">{group.letter}</Text>
                              {group.values.map((p) => (
                                <Pressable 
                                  key={p} 
                                  onPress={() => {
                                    setState(p);
                                    setCity('');
                                    setShowProvinceOptions(false);
                                  }}
                                  className="py-2.5 border-b border-violet-50 last:border-0">
                                  <Text className={`font-inter text-sm ${state === p ? 'font-inter-bold text-violet-700' : 'text-violet-900'}`}>{p}</Text>
                                </Pressable>
                              ))}
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* City Collapsible */}
                  <View>
                    <Text className="mb-2 font-inter-bold text-[10px] uppercase tracking-wider text-violet-400">City / Municipality</Text>
                    <Pressable
                      onPress={() => {
                        if (!state) {
                          showAlert({ title: 'Notice', message: 'Please select a province first.', type: 'info' });
                          return;
                        }
                        setShowCityOptions(!showCityOptions);
                        setShowProvinceOptions(false);
                      }}
                      className={`h-14 flex-row items-center justify-between rounded-2xl border border-violet-100 bg-violet-50/50 px-4 ${showCityOptions ? 'rounded-b-none' : ''}`}>
                      <Text className={`font-inter text-base ${city ? 'text-violet-900' : 'text-violet-300'}`}>
                        {city || 'Select City'}
                      </Text>
                      <FontAwesome name={showCityOptions ? 'chevron-up' : 'chevron-down'} size={12} color="#7C3AED" />
                    </Pressable>
                    {showCityOptions && (
                      <View className="max-h-60 rounded-b-2xl border border-t-0 border-violet-100 bg-white overflow-hidden">
                        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                          {cityGrouped.map((group) => (
                            <View key={group.letter} className="px-4 py-2">
                              <Text className="font-inter-bold text-xs text-violet-300 mb-1">{group.letter}</Text>
                              {group.values.map((c) => (
                                <Pressable 
                                  key={c} 
                                  onPress={() => {
                                    setCity(c);
                                    setShowCityOptions(false);
                                  }}
                                  className="py-2.5 border-b border-violet-50 last:border-0">
                                  <Text className={`font-inter text-sm ${city === c ? 'font-inter-bold text-violet-700' : 'text-violet-900'}`}>{c}</Text>
                                </Pressable>
                              ))}
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Zip Code */}
                  <View>
                    <Text className="mb-2 font-inter-bold text-[10px] uppercase tracking-wider text-violet-400">Postal Code</Text>
                    <TextInput 
                      value={postalCode}
                      onChangeText={setPostalCode}
                      placeholder="1000"
                      keyboardType="numeric"
                      className="h-14 rounded-2xl bg-violet-50/50 px-4 font-inter text-violet-900 border border-violet-100"
                    />
                  </View>

                  <Pressable
                    onPress={handleAddAddress}
                    disabled={isSubmitting}
                    className="mt-4 h-14 items-center justify-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-600/30">
                    {isSubmitting ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="font-inter-bold text-base text-white">Save Address</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

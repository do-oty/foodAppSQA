import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, ScrollView, Text, TextInput, View, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiCartItem, ApiAddress, extractArray } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlert } from '../components/ui/custom-alert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatPrice = (v?: number | string | null) => {
  if (v == null || v === '') return 'P0.00';
  const n = Number(v);
  return Number.isNaN(n) ? `P${v}` : `P${n.toFixed(2)}`;
};

export default function CheckoutScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ApiCartItem[]>([]);
  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const { showAlert } = useAlert();
  
  // Modals & Sheets
  const [showAddressSheet, setShowAddressSheet] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'card', 'ewallet'
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  
  useEffect(() => {
    const load = async () => {
      try {
        const [cartRes, addrRes] = await Promise.all([
          api.getCart(),
          api.getAddresses()
        ]);
        setItems(extractArray(cartRes));
        
        const addrs = extractArray(addrRes);
        setAddresses(addrs);
        const defaultAddr = addrs.find((a: any) => a.is_default) || addrs[0];
        if (defaultAddr) setAddressId(defaultAddr.id);
      } catch (err) {
        showAlert({ title: 'Error', message: 'Could not load checkout details.', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const subtotal = items.reduce((sum, item) => sum + (Number(item.menu_item?.price || 0) * item.quantity), 0);
  const deliveryFee = 50; 
  const discount = promoApplied ? subtotal * 0.1 : 0; // 10% discount
  const total = subtotal + deliveryFee - discount;

  const handleApplyPromo = () => {
    if (promoCode.toUpperCase() === 'PROMO10') {
      setPromoApplied(true);
      showAlert({ title: 'Success', message: '10% discount applied!', type: 'success' });
    } else {
      setPromoApplied(false);
      showAlert({ title: 'Invalid', message: 'Promo code not found or expired.', type: 'warning' });
    }
  };

  const handlePlaceOrder = async () => {
    if (!addressId) {
      showAlert({ title: 'Address Required', message: 'Please set a delivery address.', type: 'warning' });
      return;
    }
    if (items.length === 0) return;

    setIsPlacingOrder(true);
    try {
      const selectedAddressObj = addresses.find(a => a.id === addressId);
      
      const orderData = {
        restaurant_id: items[0].restaurant_id || items[0].menu_item?.restaurant_id || '',
        delivery_address_id: addressId,
        street_address: selectedAddressObj ? `${selectedAddressObj.street_address}, ${selectedAddressObj.city}` : 'Unknown Address',
        payment_method: paymentMethod,
        items: items.map(i => ({
          menu_item_id: i.menu_item_id || i.menu_item?.id || '',
          quantity: i.quantity,
        }))
      };

      const res = await api.createOrder(orderData);
      const newOrder = res.data || { ...orderData, id: 'NEW', status: 'pending' };
      
      await AsyncStorage.setItem('active_tracking_order', JSON.stringify(newOrder));
      await api.clearCart();

      showAlert({ 
        title: 'Order Placed!', 
        message: 'Your food is on the way!', 
        type: 'success',
        confirmText: 'Track Order',
        onConfirm: () => { 
          router.replace('/(tabs)/home');
        }
      });
    } catch (err: any) {
      showAlert({ title: 'Checkout Failed', message: err?.message || 'Could not place order.', type: 'error' });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const selectedAddress = addresses.find(a => a.id === addressId);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row items-center border-b border-gray-100 px-4 py-4">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-50">
          <FontAwesome name="arrow-left" size={20} color="#9CA3AF" />
        </Pressable>
        <Text className="ml-4 font-inter-bold text-lg text-violet-900">Checkout</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Delivery Address */}
        <Pressable onPress={() => setShowAddressSheet(true)} className="mb-6 rounded-3xl border border-violet-100 bg-violet-50 p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-violet-200">
                <FontAwesome name="map-marker" size={14} color="#7C3AED" />
              </View>
              <Text className="ml-2 font-inter-bold text-base text-violet-900">Delivery Address</Text>
            </View>
            <Text className="font-inter-bold text-sm text-violet-600">Change</Text>
          </View>
          <Text className="mt-3 font-inter-light text-sm text-violet-700">
            {selectedAddress ? `${selectedAddress.street_address}, ${selectedAddress.city}` : 'No address set. Tap to change.'}
          </Text>
        </Pressable>

        {/* Order Summary */}
        <Text className="mb-3 font-inter-bold text-lg text-violet-900">Order Summary</Text>
        <View className="mb-6 rounded-3xl border border-violet-100 bg-white p-4">
          {items.map((item) => (
            <View key={item.id} className="mb-3 flex-row justify-between">
              <View className="flex-1 pr-4">
                <Text className="font-inter-bold text-sm text-violet-900">{item.quantity} × {item.menu_item?.name}</Text>
              </View>
              <Text className="font-inter text-sm text-violet-700">
                {formatPrice(Number(item.menu_item?.price || 0) * item.quantity)}
              </Text>
            </View>
          ))}
          
          <View className="mt-2 border-t border-violet-100 pt-3">
            <View className="mb-2 flex-row justify-between">
              <Text className="font-inter-light text-sm text-violet-600">Subtotal</Text>
              <Text className="font-inter text-sm text-violet-900">{formatPrice(subtotal)}</Text>
            </View>
            <View className="mb-2 flex-row justify-between">
              <Text className="font-inter-light text-sm text-violet-600">Delivery Fee</Text>
              <Text className="font-inter text-sm text-violet-900">{formatPrice(deliveryFee)}</Text>
            </View>
            {promoApplied && (
              <View className="flex-row justify-between">
                <Text className="font-inter-light text-sm text-green-600">Promo Discount</Text>
                <Text className="font-inter-bold text-sm text-green-600">-{formatPrice(discount)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Promo Code */}
        <Text className="mb-3 font-inter-bold text-lg text-violet-900">Promo Code</Text>
        <View className="mb-6 flex-row items-center rounded-2xl border border-violet-100 bg-white p-2">
          <FontAwesome name="tag" size={16} color="#A78BFA" className="ml-2" />
          <TextInput
            className="flex-1 px-3 font-inter text-sm text-violet-900"
            placeholder="Enter PROMO10"
            value={promoCode}
            onChangeText={setPromoCode}
            placeholderTextColor="#A78BFA"
          />
          <Pressable onPress={handleApplyPromo} className="rounded-xl bg-violet-100 px-4 py-2">
            <Text className="font-inter-bold text-sm text-violet-600">Apply</Text>
          </Pressable>
        </View>

        {/* Payment Method */}
        <Text className="mb-3 font-inter-bold text-lg text-violet-900">Payment</Text>
        <View className="mb-6 gap-3">
          <Pressable onPress={() => setPaymentMethod('cash')} className={`flex-row items-center justify-between rounded-2xl border ${paymentMethod === 'cash' ? 'border-violet-600 bg-violet-50' : 'border-violet-100 bg-white'} p-4`}>
            <View className="flex-row items-center">
              <FontAwesome name="money" size={18} color="#22C55E" />
              <Text className="ml-3 font-inter-bold text-base text-violet-900">Cash on Delivery</Text>
            </View>
            {paymentMethod === 'cash' && <FontAwesome name="check-circle" size={20} color="#7C3AED" />}
          </Pressable>
          <Pressable onPress={() => setPaymentMethod('card')} className={`flex-row items-center justify-between rounded-2xl border ${paymentMethod === 'card' ? 'border-violet-600 bg-violet-50' : 'border-violet-100 bg-white'} p-4`}>
            <View className="flex-row items-center">
              <FontAwesome name="credit-card" size={18} color="#F59E0B" />
              <Text className="ml-3 font-inter-bold text-base text-violet-900">Credit Card</Text>
            </View>
            {paymentMethod === 'card' && <FontAwesome name="check-circle" size={20} color="#7C3AED" />}
          </Pressable>
          <Pressable onPress={() => setPaymentMethod('ewallet')} className={`flex-row items-center justify-between rounded-2xl border ${paymentMethod === 'ewallet' ? 'border-violet-600 bg-violet-50' : 'border-violet-100 bg-white'} p-4`}>
            <View className="flex-row items-center">
              <FontAwesome name="mobile-phone" size={24} color="#3B82F6" />
              <Text className="ml-3 font-inter-bold text-base text-violet-900">E-Wallet</Text>
            </View>
            {paymentMethod === 'ewallet' && <FontAwesome name="check-circle" size={20} color="#7C3AED" />}
          </Pressable>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="absolute bottom-0 w-full border-t border-violet-100 bg-white px-4 pb-6 pt-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="font-inter-bold text-lg text-violet-900">Total</Text>
          <Text className="font-inter-extrabold text-xl text-violet-900">{formatPrice(total)}</Text>
        </View>
        <Pressable 
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder || items.length === 0}
          className="h-14 items-center justify-center rounded-2xl bg-violet-600 opacity-100 disabled:opacity-50">
          {isPlacingOrder ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="font-inter-bold text-base text-white">Place Order</Text>
          )}
        </Pressable>
      </View>

      {/* Address Selector Modal */}
      <Modal visible={showAddressSheet} animationType="fade" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="min-h-[50%] rounded-t-3xl bg-white p-6">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-inter-bold text-xl text-violet-900">Select Address</Text>
              <Pressable onPress={() => setShowAddressSheet(false)}>
                <FontAwesome name="close" size={20} color="#A78BFA" />
              </Pressable>
            </View>
            {addresses.length === 0 ? (
              <Text className="font-inter text-violet-500">No addresses saved. Please add one in the Account tab.</Text>
            ) : (
              addresses.map(a => (
                <Pressable 
                  key={a.id} 
                  onPress={() => { setAddressId(a.id); setShowAddressSheet(false); }}
                  className={`mb-3 flex-row items-center justify-between rounded-2xl border p-4 ${addressId === a.id ? 'border-violet-600 bg-violet-50' : 'border-violet-100 bg-white'}`}>
                  <View className="flex-1 pr-4">
                    <Text className="font-inter-bold text-base text-violet-900">{a.label}</Text>
                    <Text className="font-inter-light text-[11px] text-gray-500" numberOfLines={1}>
                      <FontAwesome name="map-marker" size={10} color="#D1D5DB" /> {a.street_address}, {a.city}
                    </Text>
                  </View>
                  {addressId === a.id && <FontAwesome name="check" size={16} color="#7C3AED" />}
                </Pressable>
              ))
            )}
            <Pressable onPress={() => { setShowAddressSheet(false); router.push('/addresses'); }} className="mt-4 rounded-xl border border-violet-200 py-3 items-center">
              <Text className="font-inter-bold text-violet-600">Manage Addresses</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

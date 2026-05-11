import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Pressable, Text, Modal, Animated, ScrollView } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { useAlert } from '../../components/ui/custom-alert';
import { sendLocalNotification } from '../../services/notifications';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [showTracker, setShowTracker] = useState(false);
  const panelTranslateY = useRef(new Animated.Value(1000)).current;

  const openTracker = () => {
    setShowTracker(true);
    Animated.timing(panelTranslateY, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
  };

  const closeTracker = () => {
    Animated.timing(panelTranslateY, {
      toValue: 1000,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowTracker(false));
  };

  const { showAlert } = useAlert();

  useEffect(() => {
    const checkOrder = async () => {
      const order = await AsyncStorage.getItem('active_tracking_order');
      if (order) setActiveOrder(JSON.parse(order));
      
      const notifs = await AsyncStorage.getItem('unread_notifs');
      if (notifs === null) await AsyncStorage.setItem('unread_notifs', '1');
    };
    checkOrder();
    const interval = setInterval(checkOrder, 3000);
    return () => clearInterval(interval);
  }, []);

  const [isUpdatingState, setIsUpdatingState] = useState(false);

  const advanceOrderState = async () => {
    if (!activeOrder || isUpdatingState) return;
    setIsUpdatingState(true);
    
    let nextStatus = activeOrder.status;
    let notifTitle = '';
    let notifBody = '';

    if (activeOrder.status === 'pending') {
      nextStatus = 'confirmed';
      notifTitle = 'Order Confirmed! ✅';
      notifBody = 'The restaurant has received and confirmed your order.';
    } else if (activeOrder.status === 'confirmed') {
      nextStatus = 'preparing';
      notifTitle = 'Cooking Started! 👨‍🍳';
      notifBody = 'The restaurant is now preparing your delicious meal.';
    } else if (activeOrder.status === 'preparing') {
      nextStatus = 'ready_for_pickup';
      notifTitle = 'Food is ready! 🍱';
      notifBody = 'Your order is ready and waiting for our rider.';
    } else if (activeOrder.status === 'ready_for_pickup') {
      nextStatus = 'out_for_delivery';
      notifTitle = 'Food is on the way! 🛵';
      notifBody = 'Our rider has picked up your order and is heading to you.';
    } else if (activeOrder.status === 'out_for_delivery') {
      nextStatus = 'delivered';
      notifTitle = 'Order Delivered! 🍕';
      notifBody = 'Enjoy your meal! Your order has been successfully delivered.';
    }

    const updatedOrder = { ...activeOrder, status: nextStatus };
    
    // Sync with API
    try {
      await api.updateOrderStatus(activeOrder.id, nextStatus);
      
      if (nextStatus === 'delivered') {
        // Sync with AsyncStorage for cross-tab availability (without manual history backup)
        await AsyncStorage.removeItem('active_tracking_order');
        setActiveOrder(null);
        closeTracker();
        
        showAlert({ title: 'Delivered!', message: 'Your order has arrived.', type: 'success' });
        await sendLocalNotification(notifTitle, notifBody);
      } else {
        await AsyncStorage.setItem('active_tracking_order', JSON.stringify(updatedOrder));
        setActiveOrder(updatedOrder);
        if (notifTitle) await sendLocalNotification(notifTitle, notifBody);
      }
    } catch (err: any) {
      console.error('Failed to sync status with API:', err);
      showAlert({ 
        title: 'Sync Error', 
        message: err?.message || 'Failed to update status on server. Please try again.', 
        type: 'error' 
      });
    } finally {
      setIsUpdatingState(false);
    }
  };

  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    const checkUnread = async () => {
      const val = await AsyncStorage.getItem('unread_notifs');
      setUnreadNotifs(val ? parseInt(val, 10) : 0);
    };
    checkUnread();
    const interval = setInterval(checkUnread, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#6D28D9',
          tabBarInactiveTintColor: '#7C7390',
          tabBarStyle: {
            height: 60 + insets.bottom,
            paddingTop: 8,
            paddingBottom: Math.max(10, insets.bottom),
            backgroundColor: '#FFFFFF',
            borderTopColor: '#EDE9FE',
          },
        }}>
        <Tabs.Screen name="home" options={{ title: 'Food', tabBarIcon: ({ color, size }) => <FontAwesome name="cutlery" size={size} color={color} /> }} />
        <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: ({ color, size }) => <FontAwesome name="search" size={size} color={color} /> }} />
        <Tabs.Screen name="favorites" options={{ title: 'Favorites', tabBarIcon: ({ color, size }) => <FontAwesome name="heart-o" size={size} color={color} /> }} />
        <Tabs.Screen 
          name="account" 
          options={{ 
            title: 'Account', 
            tabBarIcon: ({ color, size }) => <FontAwesome name="user-o" size={size} color={color} />,
            tabBarBadge: unreadNotifs > 0 ? unreadNotifs : undefined,
            tabBarBadgeStyle: { backgroundColor: '#7C3AED', fontSize: 10 }
          }} 
        />
      </Tabs>

      {/* Floating Tracker Button */}
      {activeOrder && (
        <Pressable 
          onPress={openTracker}
          style={{ position: 'absolute', bottom: 110, left: 16 }}
          className="h-14 w-14 items-center justify-center rounded-full bg-violet-600 shadow-lg shadow-violet-900/30">
          <FontAwesome name="motorcycle" size={24} color="white" />
          <View className="absolute -top-1 -right-1 h-4 w-4 items-center justify-center rounded-full bg-red-500">
            <View className="h-2 w-2 rounded-full bg-white" />
          </View>
        </Pressable>
      )}

      {/* Tracker Modal */}
      <Modal visible={showTracker} animationType="none" transparent onRequestClose={closeTracker}>
        <View className="flex-1 justify-end">
          <Pressable onPress={closeTracker} className="absolute inset-0 bg-black/40" />
          
          <Animated.View 
            style={{
              transform: [{ translateY: panelTranslateY }],
              height: '60%',
              backgroundColor: 'white',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              elevation: 0,
            }}>
            <View style={{ flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }}>
            <View className="flex-row items-center justify-between border-b border-gray-100 px-4 pb-4 pt-5">
              <Text className="font-inter-bold text-lg text-violet-900 flex-1 pr-2" numberOfLines={1}>
                Track Order #{String(activeOrder?.id || '').slice(0, 8).toUpperCase()}
              </Text>
              <Pressable onPress={closeTracker} className="h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                <FontAwesome name="close" size={16} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {/* Fake Map */}
              <View className="h-48 w-full items-center justify-center bg-gray-200">
                <FontAwesome name="map" size={48} color="#9CA3AF" />
                <Text className="font-inter-bold text-gray-500">Live Map View</Text>
                <Text className="font-inter-light text-xs text-gray-400">(Simulated Tracking)</Text>
              </View>
              
              <View className="p-6">
                <Text className="mb-4 font-inter-bold text-lg text-violet-900">Order Progress</Text>
                
                <View className="mb-6">
                  {[
                    { key: 'confirmed', label: 'Confirmed', icon: 'check', activeStatuses: ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered'] },
                    { key: 'preparing', label: 'Preparing', icon: 'cutlery', activeStatuses: ['preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered'] },
                    { key: 'out_for_delivery', label: 'On its way', icon: 'motorcycle', activeStatuses: ['out_for_delivery', 'delivered'] },
                    { key: 'delivered', label: 'Delivered', icon: 'home', activeStatuses: ['delivered'] },
                  ].map((step, i, arr) => (
                    <View key={step.key} className="flex-row items-center">
                      <View className="items-center w-8">
                        <View className={`h-8 w-8 items-center justify-center rounded-full ${step.activeStatuses.includes(activeOrder?.status) ? 'bg-violet-600' : 'bg-violet-100'}`}>
                          <FontAwesome name={step.icon as any} size={step.key === 'delivered' ? 16 : 12} color={step.activeStatuses.includes(activeOrder?.status) ? 'white' : '#C4B5FD'} />
                        </View>
                        {i < arr.length - 1 && (
                          <View className={`h-10 w-1 ${arr[i+1].activeStatuses.includes(activeOrder?.status) ? 'bg-violet-600' : 'bg-violet-200'}`} />
                        )}
                      </View>
                      <View className="ml-4 h-8 justify-center flex-1">
                        <Text className={`font-inter-bold text-sm ${step.activeStatuses.includes(activeOrder?.status) ? 'text-violet-900' : 'text-violet-300'}`} numberOfLines={1}>
                          {step.label}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Force notification debug button */}
                <Pressable onPress={advanceOrderState} className="mt-4 rounded-xl border border-dashed border-violet-300 bg-violet-50 p-4 items-center">
                  <FontAwesome name="bug" size={16} color="#7C3AED" />
                  <Text className="mt-2 font-inter-bold text-violet-600">Debug: Advance Order Status</Text>
                  <Text className="mt-1 text-center font-inter-light text-xs text-violet-400">Current Status: {activeOrder?.status}</Text>
                </Pressable>

                <Pressable 
                  onPress={() => sendLocalNotification('Exclusive Offer! 🍕', 'Get 50% OFF your next order with code FOOD50. Limited time only!')}
                  className="mt-3 rounded-xl border border-dashed border-green-300 bg-green-50 p-4 items-center">
                  <FontAwesome name="gift" size={16} color="#059669" />
                  <Text className="mt-2 font-inter-bold text-green-600">Debug: Simulate Promo Notification</Text>
                </Pressable>
              </View>
            </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}


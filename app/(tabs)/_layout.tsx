import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Pressable, Text, Modal, Animated, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { useAlert } from '../../components/ui/custom-alert';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [showTracker, setShowTracker] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    const checkOrder = async () => {
      const order = await AsyncStorage.getItem('active_tracking_order');
      if (order) setActiveOrder(JSON.parse(order));
      
      // Initialize unread count for demo if not set
      const notifs = await AsyncStorage.getItem('unread_notifs');
      if (notifs === null) await AsyncStorage.setItem('unread_notifs', '1');
    };
    checkOrder();
    const interval = setInterval(checkOrder, 3000);
    return () => clearInterval(interval);
  }, []);

  const advanceOrderState = async () => {
    if (!activeOrder) return;
    
    let nextStatus = 'pending';
    if (activeOrder.status === 'pending') nextStatus = 'preparing';
    else if (activeOrder.status === 'preparing') nextStatus = 'delivered';
    else nextStatus = 'delivered';

    const updatedOrder = { ...activeOrder, status: nextStatus };
    
    if (nextStatus === 'delivered') {
      const prevOrders = JSON.parse(await AsyncStorage.getItem('user_orders') || '[]');
      const updatedOrders = prevOrders.map((o: any) => o.id === activeOrder.id ? updatedOrder : o);
      await AsyncStorage.setItem('user_orders', JSON.stringify(updatedOrders));
      
      await AsyncStorage.removeItem('active_tracking_order');
      setActiveOrder(null);
      setShowTracker(false);
      showAlert({ 
        title: 'Delivered!', 
        message: 'Your order has arrived. Enjoy your meal!', 
        type: 'success' 
      });
    } else {
      await AsyncStorage.setItem('active_tracking_order', JSON.stringify(updatedOrder));
      setActiveOrder(updatedOrder);
    }
  };

  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    const checkUnread = async () => {
      const val = await AsyncStorage.getItem('unread_notifs');
      setUnreadNotifs(val === '0' ? 0 : 1); // For demo, we just show a badge if there's unread
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
          onPress={() => setShowTracker(true)}
          style={{ position: 'absolute', bottom: 76, right: 16 }}
          className="h-14 w-14 items-center justify-center rounded-full bg-violet-600 shadow-lg shadow-violet-900/30">
          <FontAwesome name="motorcycle" size={24} color="white" />
          <View className="absolute -top-1 -right-1 h-4 w-4 items-center justify-center rounded-full bg-red-500">
            <View className="h-2 w-2 rounded-full bg-white" />
          </View>
        </Pressable>
      )}

      {/* Tracker Modal */}
      <Modal visible={showTracker} animationType="fade" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="h-[75%] rounded-t-3xl bg-white">
            <View className="flex-row items-center justify-between border-b border-gray-100 p-4">
              <Text className="font-inter-bold text-xl text-violet-900">Track Order #{activeOrder?.id}</Text>
              <Pressable onPress={() => setShowTracker(false)} className="h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                <FontAwesome name="close" size={16} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView className="flex-1">
              {/* Fake Map */}
              <View className="h-48 w-full items-center justify-center bg-gray-200">
                <FontAwesome name="map" size={48} color="#9CA3AF" />
                <Text className="mt-2 font-inter-bold text-gray-500">Live Map View</Text>
                <Text className="font-inter-light text-xs text-gray-400">(Simulated Tracking)</Text>
              </View>
              
              <View className="p-6">
                <Text className="mb-4 font-inter-bold text-lg text-violet-900">Order Progress</Text>
                
                <View className="mb-6 flex-row">
                  <View className="mr-4 items-center">
                    <View className={`h-8 w-8 items-center justify-center rounded-full ${activeOrder?.status === 'pending' || activeOrder?.status === 'preparing' || activeOrder?.status === 'delivered' ? 'bg-violet-600' : 'bg-violet-100'}`}>
                      <FontAwesome name="check" size={12} color={activeOrder?.status ? 'white' : '#C4B5FD'} />
                    </View>
                    <View className={`my-1 h-10 w-1 ${activeOrder?.status === 'preparing' || activeOrder?.status === 'delivered' ? 'bg-violet-600' : 'bg-violet-200'}`} />
                    <View className={`h-8 w-8 items-center justify-center rounded-full ${activeOrder?.status === 'preparing' || activeOrder?.status === 'delivered' ? 'bg-violet-600' : 'bg-violet-100'}`}>
                      <FontAwesome name="cutlery" size={12} color={activeOrder?.status === 'preparing' || activeOrder?.status === 'delivered' ? 'white' : '#C4B5FD'} />
                    </View>
                    <View className={`my-1 h-10 w-1 ${activeOrder?.status === 'delivered' ? 'bg-violet-600' : 'bg-violet-200'}`} />
                    <View className={`h-8 w-8 items-center justify-center rounded-full ${activeOrder?.status === 'delivered' ? 'bg-violet-600' : 'bg-violet-100'}`}>
                      <FontAwesome name="home" size={16} color={activeOrder?.status === 'delivered' ? 'white' : '#C4B5FD'} />
                    </View>
                  </View>
                  <View className="flex-1 pt-1">
                    <Text className="mb-10 font-inter-bold text-violet-900">Order Confirmed</Text>
                    <Text className="mb-10 font-inter-bold text-violet-900">Preparing Food</Text>
                    <Text className="font-inter-bold text-violet-400">Delivered</Text>
                  </View>
                </View>

                {/* Force notification debug button */}
                <Pressable onPress={advanceOrderState} className="mt-4 rounded-xl border border-dashed border-violet-300 bg-violet-50 p-4 items-center">
                  <FontAwesome name="bug" size={16} color="#7C3AED" />
                  <Text className="mt-2 font-inter-bold text-violet-600">Debug: Advance Order Status</Text>
                  <Text className="mt-1 text-center font-inter-light text-xs text-violet-400">Current Status: {activeOrder?.status}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}


import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Order Delivered!',
      message: 'Your order #1234 has been delivered. Enjoy!',
      time: '2 mins ago',
      type: 'success',
      read: false
    },
    {
      id: '2',
      title: 'Promo Alert',
      message: 'Get 50% off on your favorite pizza today.',
      time: '1 hour ago',
      type: 'info',
      read: false
    }
  ]);

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Clear notifications badge when entering
    AsyncStorage.getItem('unread_notifs').then(val => {
      setUnreadCount(val === '0' ? 0 : 1);
      AsyncStorage.setItem('unread_notifs', '0');
    });
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-6 py-4 border-b border-violet-50">
        <Pressable 
          onPress={() => router.back()} 
          className="h-10 w-10 items-center justify-center rounded-full bg-violet-50"
        >
          <FontAwesome name="arrow-left" size={16} color="#7C3AED" />
        </Pressable>
        <View className="ml-4 flex-1 flex-row items-center">
          <Text className="font-inter-bold text-xl text-violet-900">Notifications</Text>
          {unreadCount > 0 && (
            <View className="ml-3 h-6 w-6 items-center justify-center rounded-full bg-violet-600">
              <Text className="font-inter-bold text-[10px] text-white">{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-4">
        {notifications.map((notif) => (
          <View key={notif.id} className="mb-4 p-4 rounded-2xl border border-violet-100 bg-violet-50/50">
            <View className="flex-row items-start">
              <View className={`h-10 w-10 items-center justify-center rounded-full ${notif.type === 'success' ? 'bg-green-100' : 'bg-violet-100'}`}>
                <FontAwesome 
                  name={notif.type === 'success' ? 'check' : 'bell'} 
                  size={14} 
                  color={notif.type === 'success' ? '#22C55E' : '#7C3AED'} 
                />
              </View>
              <View className="ml-4 flex-1">
                <Text className="font-inter-bold text-base text-violet-900">{notif.title}</Text>
                <Text className="mt-1 font-inter-light text-sm text-violet-500">{notif.message}</Text>
                <Text className="mt-2 font-inter-light text-[10px] text-violet-400">{notif.time}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

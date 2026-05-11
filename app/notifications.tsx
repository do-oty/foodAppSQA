import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, ApiNotification, extractArray } from '../services/api';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const result = await api.getNotifications();
      const items = extractArray(result);
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.is_read).length);
      await AsyncStorage.setItem('unread_notifs', '0');
    } catch (err) {
      console.error('[NOTIFICATIONS] Load failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-6 py-4 border-b border-violet-50">
        <Pressable 
          onPress={() => router.back()} 
          className="h-10 w-10 items-center justify-center rounded-full bg-violet-50"
        >
          <FontAwesome name="arrow-left" size={18} color="#7C3AED" />
        </Pressable>
        <View className="ml-4 flex-1 flex-row items-center">
          <Text className="font-inter-bold text-xl text-violet-900">Notifications</Text>
          {unreadCount > 0 && (
            <View className="ml-3 h-6 w-6 items-center justify-center rounded-full bg-violet-600">
              <Text className="font-inter-bold text-[10px] text-white">{unreadCount}</Text>
            </View>
          )}
        </View>
        {notifications.length > 0 && (
          <Pressable 
            onPress={async () => {
              await api.clearAllNotifications();
              loadNotifications();
            }}
            className="ml-auto"
          >
            <Text className="font-inter-bold text-sm text-violet-600">Clear All</Text>
          </Pressable>
        )}
      </View>

      <ScrollView className="flex-1 px-6 pt-4">
        {isLoading && (
          <View className="py-8 items-center">
            <ActivityIndicator color="#7C3AED" size="large" />
          </View>
        )}

        {!isLoading && notifications.length === 0 && (
          <View className="py-12 items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-violet-50 mb-4">
              <FontAwesome name="bell-o" size={24} color="#A78BFA" />
            </View>
            <Text className="font-inter-bold text-base text-violet-900">No notifications yet</Text>
            <Text className="mt-1 text-center font-inter-light text-sm text-violet-500">
              We'll notify you when something important arrives!
            </Text>
          </View>
        )}

        {!isLoading && notifications.map((notif) => (
          <View key={notif.id} className={`mb-4 p-4 rounded-2xl border ${notif.is_read ? 'border-violet-100 bg-white' : 'border-violet-200 bg-violet-50/50'}`}>
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
                <Text className="mt-2 font-inter-light text-[10px] text-violet-400">{formatTime(notif.created_at)}</Text>
              </View>
              <Pressable 
                onPress={async () => {
                  await api.deleteNotification(notif.id);
                  loadNotifications();
                }}
                className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-violet-50"
              >
                <FontAwesome name="trash" size={14} color="#EF4444" />
              </Pressable>
            </View>
          </View>
        ))}

        {/* Debug Section */}
        <View className="mt-8 mb-12">
          <Text className="mb-4 font-inter-bold text-sm text-violet-400 uppercase tracking-widest text-center">Developer Tools</Text>
          <Pressable 
            onPress={async () => {
              const { sendLocalNotification } = require('../services/notifications');
              sendLocalNotification('Exclusive Offer! 🍕', 'Get 50% OFF your next order with code FOOD50. Limited time only!');
              await api.addLocalNotification('Exclusive Offer! 🍕', 'Get 50% OFF your next order with code FOOD50. Limited time only!', 'info');
              loadNotifications();
            }}
            className="rounded-2xl border border-dashed border-green-300 bg-green-50 p-6 items-center">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-3">
              <FontAwesome name="gift" size={20} color="#059669" />
            </View>
            <Text className="font-inter-bold text-green-700">Simulate Promo Notification</Text>
            <Text className="mt-1 text-center font-inter-light text-xs text-green-600">
              Trigger a system-level alert to test foreground/background banners.
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

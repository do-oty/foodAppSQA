import { FontAwesome } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AccountTabScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, isLoading, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('unread_notifs').then(val => {
        setUnreadNotifs(val ? parseInt(val, 10) : 0);
      });
    }, [])
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/welcome');
  };

  const onRefresh = useCallback(async () => {
    if (isAuthenticated) {
      setRefreshing(true);
      await refreshUser();
      setRefreshing(false);
    }
  }, [isAuthenticated, refreshUser]);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <ScrollView 
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}>
        {/* Header */}
        <View className="mt-6 mb-8 px-6">
          <Text className="font-inter-bold text-2xl text-violet-900">Account</Text>
          <Text className="font-inter-light text-sm text-violet-500">Manage your profile & settings</Text>
        </View>

        {/* Avatar + name row */}
        {isAuthenticated && (
          <View className="mb-6 mx-6 flex-row items-center rounded-3xl border border-violet-100 bg-violet-50 p-4">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-violet-600">
              <Text className="font-inter-bold text-2xl text-white">{initials}</Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="font-inter-bold text-lg text-violet-900">
                {user?.full_name ?? 'User'}
              </Text>
              <Text className="font-inter-light text-sm text-violet-500">
                {user?.email ?? ''}
              </Text>
              {user?.phone ? (
                <Text className="font-inter-light text-xs text-violet-400 mt-0.5">{user.phone}</Text>
              ) : null}
            </View>
            <View className="rounded-full bg-violet-100 px-3 py-1">
              <Text className="font-inter-bold text-[10px] uppercase text-violet-700">
                {user?.role ?? 'customer'}
              </Text>
            </View>
          </View>
        )}

        {/* Menu items */}
        {isAuthenticated ? (
          <View className="gap-3 px-6">
            {[
              { icon: 'map-marker', label: 'Saved Addresses', route: '/addresses' },
              { icon: 'list-alt', label: 'Order History', route: '/orders' },
              { icon: 'heart-o', label: 'Favorites', route: null },
              { icon: 'bell-o', label: 'Notifications', route: '/notifications' },
              { icon: 'cog', label: 'Settings', route: null },
            ].map((item) => (
              <Pressable
                key={item.label}
                onPress={() => item.route ? router.push(item.route as any) : null}
                className="flex-row items-center rounded-2xl border border-violet-100 bg-white px-4 py-4">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-violet-50">
                  <FontAwesome name={item.icon as any} size={15} color="#7C3AED" />
                </View>
                <Text className="ml-3 flex-1 font-inter text-base text-violet-900">{item.label}</Text>
                {item.label === 'Notifications' && unreadNotifs > 0 && (
                  <View className="mr-2 h-5 w-5 items-center justify-center rounded-full bg-violet-600">
                    <Text className="font-inter-bold text-[10px] text-white">{unreadNotifs}</Text>
                  </View>
                )}
                <FontAwesome name="chevron-right" size={14} color="#A78BFA" />
              </Pressable>
            ))}
          </View>
        ) : (
          <View className="flex-1 items-center justify-center pt-8 px-6">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-violet-50 mb-4">
              <FontAwesome name="lock" size={32} color="#7C3AED" />
            </View>
            <Text className="font-inter-bold text-xl text-violet-900">Sign in required</Text>
            <Text className="mt-2 text-center font-inter-light text-sm text-violet-500 px-6">
              Create an account or log in to manage your addresses, view order history, and save favorites.
            </Text>
            <Pressable
              onPress={() => router.push('/auth')}
              className="mt-8 h-14 min-w-[200px] items-center justify-center rounded-2xl bg-violet-600 px-6">
              <Text className="font-inter-bold text-base text-white">Log In / Sign Up</Text>
            </Pressable>
          </View>
        )}

        {isAuthenticated && (
          <View className="px-6 pb-8">
            <Pressable
              onPress={handleLogout}
              className="mt-6 h-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50">
              <Text className="font-inter-bold text-sm text-red-600">Log Out</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

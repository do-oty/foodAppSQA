import { Inter_300Light, Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';
import { AlertProvider } from '../components/ui/custom-alert';
import { useEffect } from 'react';
import { registerForPushNotificationsAsync } from '../services/notifications';
import { api } from '../services/api';

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotificationsAsync();
    
    // Pre-warm the API to mitigate cold starts (Vercel/Supabase)
    // This wakes up the server as soon as the app is launched
    api.getCategories().catch(() => {});
    api.getRestaurants({ limit: 1 }).catch(() => {});

    // Keep-alive loop: Pings the server every 5 minutes while the app is open
    // to prevent it from going back to sleep
    const interval = setInterval(() => {
      console.log('[API] Periodic keep-alive ping...');
      api.getCategories().catch(() => {});
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);
  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#FFFFFF',
      card: '#FFFFFF',
      primary: '#7C3AED',
      text: '#1F1534',
      border: '#EDE9FE',
    },
  };

  return (
    <AlertProvider>
      <ThemeProvider value={navTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="signup-email" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="signup-details" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="signup-location" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="order-again" options={{ headerShown: false }} />
          <Stack.Screen name="restaurant/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="checkout" options={{ headerShown: false }} />
          <Stack.Screen name="orders" options={{ headerShown: false }} />
          <Stack.Screen name="addresses" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="cart" options={{ headerShown: false, presentation: 'modal', gestureEnabled: true }} />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </AlertProvider>
  );
}

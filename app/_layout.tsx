import { Inter_300Light, Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

export default function RootLayout() {
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
    <ThemeProvider value={navTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen
          name="signup-email"
          options={{ title: '', headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false, gestureEnabled: true }}
        />
        <Stack.Screen
          name="signup-details"
          options={{ title: '', headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false, gestureEnabled: true }}
        />
        <Stack.Screen
          name="signup-location"
          options={{ title: '', headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false, gestureEnabled: true }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen
          name="order-again"
          options={{ title: '', headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false }}
        />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, TextInput, View, useWindowDimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { api } from '../services/api';

type ProviderButtonProps = {
  label: string;
  iconName: 'google' | 'facebook' | 'envelope-o';
  onPress: () => void;
  variant?: 'light' | 'facebook';
};

function ProviderButton({ label, iconName, onPress, variant = 'light' }: ProviderButtonProps) {
  const isFacebook = variant === 'facebook';
  return (
    <Pressable
      onPress={onPress}
      className={`h-12 flex-row items-center justify-center rounded-2xl border ${
        isFacebook ? 'border-blue-600 bg-blue-600' : 'border-violet-300 bg-white'
      }`}>
      <View className="absolute left-4">
        <FontAwesome name={iconName} size={20} color={isFacebook ? '#FFFFFF' : '#5B21B6'} />
      </View>
      <Text className={`font-inter-light text-base ${isFacebook ? 'text-white' : 'text-violet-700'}`}>{label}</Text>
    </Pressable>
  );
}

type Mode = 'choose' | 'login';

export default function AuthScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const sheetLift = useRef(new Animated.Value(120)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const sheetHeight = Math.max(420, Math.floor(height * 0.60));

  const [mode, setMode] = useState<Mode>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(sheetLift, {
        toValue: 0,
        duration: 430,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [sheetLift, contentOpacity]);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await api.login(email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-violet-600" edges={['top']}>
      <View className="relative flex-1">
        <View className="flex-1 px-4 pt-1">
          <Pressable onPress={() => router.replace('/(tabs)/home')} className="h-11 w-11 items-center justify-center rounded-full">
            <Text className="font-inter-light text-3xl text-white">×</Text>
          </Pressable>
        </View>

        <Animated.View
          style={{
            transform: [{ translateY: sheetLift }],
            height: sheetHeight,
            zIndex: 20,
            elevation: 20,
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 40,
            overflow: 'hidden',
          }}>
          <Animated.View style={{ opacity: contentOpacity }}>

            {mode === 'choose' ? (
              <>
                <Text className="font-inter-bold text-2xl text-violet-900">Sign up or Log in</Text>
                <Text className="mb-7 mt-2 font-inter-light text-sm text-violet-700">
                  Select your preferred method to continue
                </Text>
                <View className="gap-3.5">
                  <ProviderButton label="Continue with Google" iconName="google" onPress={() => router.replace('/(tabs)/home')} />
                  <ProviderButton
                    label="Continue with Facebook"
                    iconName="facebook"
                    variant="facebook"
                    onPress={() => router.replace('/(tabs)/home')}
                  />
                  <ProviderButton label="Continue with Email" iconName="envelope-o" onPress={() => setMode('login')} />
                </View>
                <Pressable onPress={() => router.push('/signup-email')} className="mt-5 items-center">
                  <Text className="font-inter-light text-sm text-violet-500">
                    New user? <Text className="font-inter-bold text-violet-700">Create an account</Text>
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                {/* Back button */}
                <Pressable onPress={() => { setMode('choose'); setError(null); }} className="mb-4 flex-row items-center">
                  <FontAwesome name="angle-left" size={18} color="#7C3AED" />
                  <Text className="ml-2 font-inter text-sm text-violet-700">Back</Text>
                </Pressable>

                <Text className="font-inter-bold text-2xl text-violet-900">Welcome back</Text>
                <Text className="mb-6 mt-2 font-inter-light text-sm text-violet-700">Log in with your email</Text>

                {/* Email input */}
                <View className="mb-3 h-[54px] flex-row items-center rounded-2xl border border-violet-200 px-4">
                  <FontAwesome name="envelope-o" size={16} color="#7C3AED" />
                  <TextInput
                    value={email}
                    onChangeText={(v) => { setEmail(v); setError(null); }}
                    placeholder="you@example.com"
                    placeholderTextColor="#8B79A9"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className="ml-3 flex-1 font-inter text-[17px] text-violet-950"
                  />
                </View>

                {/* Password input */}
                <View className="mb-4 h-[54px] flex-row items-center rounded-2xl border border-violet-200 px-4">
                  <FontAwesome name="lock" size={16} color="#7C3AED" />
                  <TextInput
                    value={password}
                    onChangeText={(v) => { setPassword(v); setError(null); }}
                    placeholder="Password"
                    placeholderTextColor="#8B79A9"
                    secureTextEntry={!showPassword}
                    className="ml-3 flex-1 font-inter text-[17px] text-violet-950"
                  />
                  <Pressable onPress={() => setShowPassword((p) => !p)} className="ml-2 h-8 w-8 items-center justify-center">
                    <FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={17} color="#6D28D9" />
                  </Pressable>
                </View>

                {/* Error */}
                {!!error && (
                  <View className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                    <Text className="font-inter text-sm text-red-700">{error}</Text>
                  </View>
                )}

                {/* Login button */}
                <Pressable
                  onPress={handleEmailLogin}
                  disabled={isLoading}
                  className="h-[50px] items-center justify-center rounded-2xl bg-violet-600">
                  {isLoading
                    ? <ActivityIndicator color="#FFFFFF" />
                    : <Text className="font-inter-bold text-base text-white">Log In</Text>
                  }
                </Pressable>

                <Pressable onPress={() => router.push('/signup-email')} className="mt-4 items-center">
                  <Text className="font-inter-light text-sm text-violet-500">
                    No account? <Text className="font-inter-bold text-violet-700">Sign up</Text>
                  </Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

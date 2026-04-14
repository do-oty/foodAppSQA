import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';

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

export default function AuthScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const sheetLift = useRef(new Animated.Value(120)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const sheetHeight = Math.max(360, Math.floor(height * 0.52));

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
          }}
        >
          <Animated.View style={{ opacity: contentOpacity }}>
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
              <ProviderButton label="Email" iconName="envelope-o" onPress={() => router.push('/signup-email')} />
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}


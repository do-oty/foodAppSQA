import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Animated, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';

const SLIDES = [
  {
    title: 'FOODAPP',
    subtitle: 'Everything you need to order faster.',
  },
  {
    title: 'ORDER\nSMOOTHER',
    subtitle: 'Save favorites, set delivery details, and checkout quickly.',
  },
  {
    title: 'TRACK\nIN REAL TIME',
    subtitle: 'See order status updates from kitchen to doorstep.',
  },
  {
    title: 'SAVE\nYOUR FAVORITES',
    subtitle: 'Reorder your top meals in one tap anytime.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const isCompact = width < 360;
  const titleSize = isCompact ? 44 : width < 420 ? 52 : 58;
  const titleLineHeight = isCompact ? 48 : width < 420 ? 56 : 62;
  const subtitleSize = isCompact ? 14 : 16;
  const subtitleWidth = Math.min(420, width - 56);
  const buttonWidth = Math.min(360, width - 56);
  const buttonTopSpacing = height < 700 ? 20 : 28;

  return (
    <SafeAreaView className="flex-1 bg-violet-600">
      <View className="flex-1">
        <Animated.ScrollView
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
          className="flex-1">
          {SLIDES.map((slide, index) => (
            <View key={slide.title} style={{ width }} className="flex-1 items-center justify-center px-6">
              <View className="items-center justify-center">
                <Text
                  style={{ fontSize: titleSize, lineHeight: titleLineHeight }}
                  className="text-center font-inter-extrabold tracking-tight text-white">
                  {slide.title}
                </Text>
                <Text
                  style={{ fontSize: subtitleSize, maxWidth: subtitleWidth }}
                  className="mt-4 text-center font-inter-light leading-6 text-violet-100">
                  {slide.subtitle}
                </Text>
                {index === SLIDES.length - 1 && (
                  <View style={{ marginTop: buttonTopSpacing, width: buttonWidth }}>
                    <Button label="Let's Get Started" variant="secondary" onPress={() => router.replace('/auth')} />
                  </View>
                )}
              </View>
            </View>
          ))}
        </Animated.ScrollView>

        <View className="absolute bottom-10 left-0 right-0 items-center" pointerEvents="none">
          <View className="flex-row items-center justify-center gap-2">
            {SLIDES.map((_, index) => {
              const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 28, 8],
                extrapolate: 'clamp',
              });
              const dotOpacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.55, 1, 0.55],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={`dot-${index}`}
                  style={{
                    width: dotWidth,
                    opacity: dotOpacity,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: '#FFFFFF',
                  }}
                />
              );
            })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}


import { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';

type ScreenProps = {
  children: ReactNode;
};

export function Screen({ children }: ScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 py-5">{children}</View>
    </SafeAreaView>
  );
}


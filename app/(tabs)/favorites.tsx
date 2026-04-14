import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';

export default function FavoritesTabScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <View className="flex-1 items-center justify-center px-6">
        <FontAwesome name="heart" size={34} color="#7C3AED" />
        <Text className="mt-4 font-inter-bold text-2xl text-violet-900">Favorites</Text>
        <Text className="mt-2 text-center font-inter-light text-sm text-violet-500">Favorites page placeholder</Text>
      </View>
    </SafeAreaView>
  );
}


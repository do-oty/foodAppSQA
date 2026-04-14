import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AccountTabScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <View className="flex-1 items-center justify-center px-6">
        <FontAwesome name="user-o" size={34} color="#7C3AED" />
        <Text className="mt-4 font-inter-bold text-2xl text-violet-900">Account</Text>
        <Text className="mt-2 text-center font-inter-light text-sm text-violet-500">Account page placeholder</Text>

        <Pressable
          onPress={() => router.replace('/welcome')}
          className="mt-6 h-11 min-w-[140px] items-center justify-center rounded-xl bg-violet-600 px-5">
          <Text className="font-inter-bold text-sm text-white">Log out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}


import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, Vibration, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';

export default function SignupEmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [showError, setShowError] = useState(false);

  const isEmailValid = (value: string) => /\S+@\S+\.\S+/.test(value);

  const handleNext = () => {
    const valid = isEmailValid(email.trim());
    setShowError(!valid);
    if (!valid) {
      Vibration.vibrate(120);
      return;
    }

    router.push({ pathname: '/signup-details', params: { email: email.trim() } });
  };

  return (
    <Screen>
      <View className="flex-1 bg-white pt-2">
        <View className="mb-4 flex-row items-center">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-50">
            <FontAwesome name="arrow-left" size={20} color="#9CA3AF" />
          </Pressable>
        </View>
        <Text className="mb-2 font-inter-bold text-3xl text-violet-900">Your email</Text>
        <Text className="mb-5 font-inter-light text-sm text-violet-700">
          We check if an account exists. New users continue to sign up.
        </Text>

        <View className={`mb-2 h-12 flex-row items-center rounded-2xl border px-3 ${showError ? 'border-red-500' : 'border-violet-200'}`}>
          <FontAwesome name="envelope-o" size={16} color={showError ? '#EF4444' : '#7C3AED'} />
          <TextInput
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (showError) setShowError(false);
            }}
            placeholder="you@example.com"
            placeholderTextColor="#8B79A9"
            autoCapitalize="none"
            keyboardType="email-address"
            className="ml-3 flex-1 font-inter text-base text-violet-950"
          />
        </View>
        {showError && <Text className="mb-3 font-inter-light text-xs text-red-500">Please enter a valid email address.</Text>}

        <Button label="Next" onPress={handleNext} />
      </View>
    </Screen>
  );
}


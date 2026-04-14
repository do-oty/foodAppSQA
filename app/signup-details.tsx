import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, Vibration, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';

type FieldName =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'password'
  | 'confirmPassword';

export default function SignupDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const passwordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEmailValid = (value: string) => /\S+@\S+\.\S+/.test(value);

  const autoHidePassword = () => {
    if (passwordTimerRef.current) clearTimeout(passwordTimerRef.current);
    setShowPassword(true);
    passwordTimerRef.current = setTimeout(() => setShowPassword(false), 650);
  };

  const handleMaskedChange = (
    nextValue: string,
    currentRaw: string,
    setRaw: (value: string) => void,
    maskChar = '*'
  ) => {
    if (nextValue.length < currentRaw.length) {
      setRaw(currentRaw.slice(0, nextValue.length));
      return;
    }

    const appended = nextValue.slice(currentRaw.length).replace(new RegExp(`\\${maskChar}`, 'g'), '');
    setRaw(currentRaw + appended);
  };

  const validate = () => {
    const nextErrors: Partial<Record<FieldName, string>> = {};

    if (!firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!lastName.trim()) nextErrors.lastName = 'Last name is required.';
    if (!email.trim() || !isEmailValid(email.trim())) nextErrors.email = 'Valid email is required.';
    if (!password) nextErrors.password = 'Password is required.';
    if (!confirmPassword) nextErrors.confirmPassword = 'Confirm your password.';
    if (password && confirmPassword && password !== confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.';

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      Vibration.vibrate(140);
      return false;
    }

    return true;
  };

  const inputClasses = (field: FieldName) =>
    `rounded-2xl border px-4 ${errors[field] ? 'border-red-500' : 'border-violet-200'}`;

  return (
    <Screen>
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingTop: 20, paddingBottom: 28 }}>
        <Text className="mb-2 font-inter-bold text-3xl text-violet-900">Create account</Text>
        <Text className="mb-5 font-inter-light text-sm text-violet-700">Fill your account details to continue.</Text>

        <View className="mb-3">
          <View className={`${inputClasses('firstName')} h-[54px]`}>
            <TextInput
              value={firstName}
              onChangeText={(value) => {
                setFirstName(value);
                if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: undefined }));
              }}
              placeholder="First name"
              placeholderTextColor="#8B79A9"
              className="h-full px-1 font-inter text-[17px] text-violet-950"
            />
          </View>
        </View>

        <View className="mb-4">
          <View className={`${inputClasses('lastName')} h-[54px]`}>
            <TextInput
              value={lastName}
              onChangeText={(value) => {
                setLastName(value);
                if (errors.lastName) setErrors((prev) => ({ ...prev, lastName: undefined }));
              }}
              placeholder="Last name"
              placeholderTextColor="#8B79A9"
              className="h-full px-1 font-inter text-[17px] text-violet-950"
            />
          </View>
        </View>

        <View className="mb-4">
          <View className={`${inputClasses('email')} h-[60px]`}>
            <View className="h-full flex-row items-center">
              <FontAwesome name="envelope-o" size={18} color={errors.email ? '#EF4444' : '#7C3AED'} />
              <TextInput
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="Email"
                placeholderTextColor="#8B79A9"
                autoCapitalize="none"
                keyboardType="email-address"
                className="h-full flex-1 pl-3 font-inter text-[17px] text-violet-950"
              />
            </View>
          </View>
        </View>

        <View className="mb-4">
          <View className={`${inputClasses('password')} h-[60px]`}>
            <View className="h-full flex-row items-center">
              <TextInput
                value={showPassword ? password : '*'.repeat(password.length)}
                onChangeText={(value) => {
                  if (showPassword) {
                    setPassword(value);
                  } else {
                    handleMaskedChange(value, password, setPassword);
                  }
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  autoHidePassword();
                }}
                placeholder="Password"
                placeholderTextColor="#8B79A9"
                secureTextEntry={false}
                className="flex-1 pr-1 font-inter text-[17px] text-violet-950"
              />
              <Pressable onPress={() => setShowPassword((prev) => !prev)} className="ml-2 h-8 w-8 items-center justify-center">
                <FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={17} color="#6D28D9" />
              </Pressable>
            </View>
          </View>
        </View>

        <View className="mb-5">
          <View className={`${inputClasses('confirmPassword')} h-[60px]`}>
            <TextInput
              value={'*'.repeat(confirmPassword.length)}
              onChangeText={(value) => {
                handleMaskedChange(value, confirmPassword, setConfirmPassword);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              placeholder="Confirm password"
              placeholderTextColor="#8B79A9"
              secureTextEntry={false}
              className="h-full px-1 font-inter text-[17px] text-violet-950"
            />
          </View>
        </View>

        <Button
          label="Next"
          onPress={() => {
            if (!validate()) return;
            router.push('/signup-location');
          }}
        />
      </ScrollView>
    </Screen>
  );
}


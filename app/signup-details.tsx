import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, Vibration, View, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '../hooks/useAuth';

type FieldName = 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword';

// ─── Password strength ────────────────────────────────────────────────────────
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '#E5E7EB' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#EF4444' };
  if (score <= 3) return { score, label: 'Fair', color: '#F97316' };
  if (score === 4) return { score, label: 'Good', color: '#22C55E' };
  return { score, label: 'Strong', color: '#16A34A' };
}

// ─── Requirement row ─────────────────────────────────────────────────────────
function Req({ met, label }: { met: boolean; label: string }) {
  return (
    <View className="flex-row items-center" style={{ marginBottom: 2 }}>
      <FontAwesome
        name={met ? 'check-circle' : 'circle-o'}
        size={11}
        color={met ? '#22C55E' : '#A78BFA'}
      />
      <Text
        style={{ marginLeft: 5, fontSize: 11, color: met ? '#15803D' : '#7C3AED', fontFamily: 'Inter_400Regular' }}>
        {label}
      </Text>
    </View>
  );
}

export default function SignupDetailsScreen() {
  const router = useRouter();
  const auth = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const passwordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const isEmailValid = (v: string) => /\S+@\S+\.\S+/.test(v);
  const strength = getPasswordStrength(password);

  // Password requirement checks
  const pwReqs = {
    length: password.length >= 6,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    match: !!password && password === confirmPassword,
  };

  // Auto-hide last char while typing masked
  const autoHidePassword = () => {
    if (passwordTimerRef.current) clearTimeout(passwordTimerRef.current);
    setShowPassword(true);
    passwordTimerRef.current = setTimeout(() => setShowPassword(false), 650);
  };

  const handleMaskedChange = (
    nextValue: string,
    currentRaw: string,
    setRaw: (v: string) => void,
  ) => {
    if (nextValue.length < currentRaw.length) {
      setRaw(currentRaw.slice(0, nextValue.length));
      return;
    }
    const appended = nextValue.slice(currentRaw.length).replace(/\*/g, '');
    setRaw(currentRaw + appended);
  };

  const touch = (field: FieldName) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const validate = () => {
    const nextErrors: Partial<Record<FieldName, string>> = {};
    if (!firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!lastName.trim()) nextErrors.lastName = 'Last name is required.';
    if (!email.trim() || !isEmailValid(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!password) nextErrors.password = 'Password is required.';
    else if (password.length < 6) nextErrors.password = 'Must be at least 6 characters.';
    if (!confirmPassword) nextErrors.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      Vibration.vibrate(140);
      setTouched({ firstName: true, lastName: true, email: true, password: true, confirmPassword: true });
      return false;
    }
    if (globalError && globalError.includes('already registered')) return false;
    return true;
  };

  const handleEmailBlur = async () => {
    touch('email');
    if (!email.trim() || !isEmailValid(email.trim())) {
      setErrors((p) => ({ ...p, email: 'Enter a valid email address.' }));
      return;
    }
    
    // Check existence immediately
    setIsCheckingEmail(true);
    try {
      const { api } = require('../services/api');
      const res = await api.checkEmail(email.trim());
      if (res.data?.exists) {
        setGlobalError('This email is already registered. Please log in instead.');
        Vibration.vibrate(140);
      } else {
        setGlobalError(null);
      }
    } catch (err) {
      // Endpoint might not be deployed yet, silently fail or ignore
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const borderColor = (field: FieldName) => {
    if (!touched[field]) return 'border-violet-200';
    if (errors[field]) return 'border-red-400';
    return 'border-green-400';
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 36 }}
        keyboardShouldPersistTaps="handled">
        <View className="mb-4 flex-row items-center">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-50">
            <FontAwesome name="arrow-left" size={20} color="#9CA3AF" />
          </Pressable>
        </View>
        <Text className="mb-1 font-inter-bold text-3xl text-violet-900">Create account</Text>
        <Text className="mb-6 font-inter-light text-sm text-violet-500">
          All fields are required unless noted.
        </Text>

        {globalError && (
          <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <Text className="font-inter-bold text-sm text-red-800">{globalError}</Text>
            {globalError.includes('already registered') && (
              <Pressable onPress={() => router.push('/auth')} className="mt-3 rounded-xl bg-red-100 py-2 items-center">
                <Text className="font-inter-bold text-xs text-red-700">Go to Log In</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ── First name ── */}
        <View className="mb-1">
          <Text className="mb-1.5 font-inter-bold text-xs uppercase tracking-wide text-violet-500">
            First Name
          </Text>
          <View className={`h-[54px] rounded-2xl border px-4 ${borderColor('firstName')}`}>
            <TextInput
              value={firstName}
              onChangeText={(v) => {
                setFirstName(v);
                setErrors((p) => ({ ...p, firstName: undefined }));
              }}
              onBlur={() => {
                touch('firstName');
                if (!firstName.trim()) setErrors((p) => ({ ...p, firstName: 'First name is required.' }));
              }}
              placeholder="e.g. Juan"
              placeholderTextColor="#A78BFA"
              className="h-full font-inter text-[17px] text-violet-950"
            />
          </View>
          {touched.firstName && errors.firstName && (
            <Text className="mt-1 font-inter text-xs text-red-500">{errors.firstName}</Text>
          )}
        </View>

        {/* ── Last name ── */}
        <View className="mb-4 mt-3">
          <Text className="mb-1.5 font-inter-bold text-xs uppercase tracking-wide text-violet-500">
            Last Name
          </Text>
          <View className={`h-[54px] rounded-2xl border px-4 ${borderColor('lastName')}`}>
            <TextInput
              value={lastName}
              onChangeText={(v) => {
                setLastName(v);
                setErrors((p) => ({ ...p, lastName: undefined }));
              }}
              onBlur={() => {
                touch('lastName');
                if (!lastName.trim()) setErrors((p) => ({ ...p, lastName: 'Last name is required.' }));
              }}
              placeholder="e.g. Dela Cruz"
              placeholderTextColor="#A78BFA"
              className="h-full font-inter text-[17px] text-violet-950"
            />
          </View>
          {touched.lastName && errors.lastName && (
            <Text className="mt-1 font-inter text-xs text-red-500">{errors.lastName}</Text>
          )}
        </View>

        {/* ── Email ── */}
        <View className="mb-4">
          <Text className="mb-1.5 font-inter-bold text-xs uppercase tracking-wide text-violet-500">
            Email Address
          </Text>
          <View className={`h-[54px] flex-row items-center rounded-2xl border px-4 ${borderColor('email')}`}>
            <FontAwesome name="envelope-o" size={16} color={errors.email && touched.email ? '#EF4444' : '#7C3AED'} />
            <TextInput
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setErrors((p) => ({ ...p, email: undefined }));
                if (globalError?.includes('already registered')) setGlobalError(null);
              }}
              onBlur={handleEmailBlur}
              placeholder="you@example.com"
              placeholderTextColor="#A78BFA"
              autoCapitalize="none"
              keyboardType="email-address"
              className="ml-3 flex-1 font-inter text-[17px] text-violet-950"
            />
            {isCheckingEmail && <ActivityIndicator size="small" color="#7C3AED" />}
          </View>
          {touched.email && errors.email && (
            <Text className="mt-1 font-inter text-xs text-red-500">{errors.email}</Text>
          )}
        </View>

        {/* ── Password ── */}
        <View className="mb-2">
          <Text className="mb-1.5 font-inter-bold text-xs uppercase tracking-wide text-violet-500">
            Password
          </Text>
          <View className={`h-[54px] flex-row items-center rounded-2xl border px-4 ${borderColor('password')}`}>
            <FontAwesome name="lock" size={16} color="#7C3AED" />
            <TextInput
              value={showPassword ? password : '*'.repeat(password.length)}
              onChangeText={(v) => {
                if (showPassword) {
                  setPassword(v);
                } else {
                  handleMaskedChange(v, password, setPassword);
                }
                setErrors((p) => ({ ...p, password: undefined }));
                autoHidePassword();
              }}
              onBlur={() => touch('password')}
              placeholder="Min. 6 characters"
              placeholderTextColor="#A78BFA"
              secureTextEntry={false}
              className="ml-3 flex-1 font-inter text-[17px] text-violet-950"
            />
            <Pressable onPress={() => setShowPassword((p) => !p)} className="ml-2 h-8 w-8 items-center justify-center">
              <FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={16} color="#6D28D9" />
            </Pressable>
          </View>

          {/* Strength bar — only shows when user has started typing */}
          {password.length > 0 && (
            <View className="mt-2">
              <View className="flex-row gap-1" style={{ gap: 4 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 99,
                      backgroundColor: i <= strength.score ? strength.color : '#E5E7EB',
                    }}
                  />
                ))}
              </View>
              <Text style={{ marginTop: 4, fontSize: 11, color: strength.color, fontFamily: 'Inter_600SemiBold' }}>
                {strength.label} password
              </Text>
            </View>
          )}

          {/* Requirements checklist */}
          {(touched.password || password.length > 0) && (
            <View className="mt-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5" style={{ gap: 3 }}>
              <Req met={pwReqs.length} label="At least 6 characters" />
              <Req met={pwReqs.upper} label="One uppercase letter (recommended)" />
              <Req met={pwReqs.number} label="One number (recommended)" />
            </View>
          )}

          {touched.password && errors.password && (
            <Text className="mt-1 font-inter text-xs text-red-500">{errors.password}</Text>
          )}
        </View>

        {/* ── Confirm Password ── */}
        <View className="mb-6 mt-3">
          <Text className="mb-1.5 font-inter-bold text-xs uppercase tracking-wide text-violet-500">
            Confirm Password
          </Text>
          <View className={`h-[54px] flex-row items-center rounded-2xl border px-4 ${borderColor('confirmPassword')}`}>
            <FontAwesome name="lock" size={16} color="#7C3AED" />
            <TextInput
              value={showConfirm ? confirmPassword : '*'.repeat(confirmPassword.length)}
              onChangeText={(v) => {
                if (showConfirm) {
                  setConfirmPassword(v);
                } else {
                  handleMaskedChange(v, confirmPassword, setConfirmPassword);
                }
                setErrors((p) => ({ ...p, confirmPassword: undefined }));
              }}
              onBlur={() => {
                touch('confirmPassword');
                if (confirmPassword !== password)
                  setErrors((p) => ({ ...p, confirmPassword: 'Passwords do not match.' }));
              }}
              placeholder="Re-enter your password"
              placeholderTextColor="#A78BFA"
              secureTextEntry={false}
              className="ml-3 flex-1 font-inter text-[17px] text-violet-950"
            />
            <Pressable onPress={() => setShowConfirm((p) => !p)} className="ml-2 h-8 w-8 items-center justify-center">
              <FontAwesome name={showConfirm ? 'eye-slash' : 'eye'} size={16} color="#6D28D9" />
            </Pressable>
          </View>

          {/* Match indicator */}
          {confirmPassword.length > 0 && (
            <View className="mt-1.5 flex-row items-center">
              <FontAwesome
                name={pwReqs.match ? 'check-circle' : 'times-circle'}
                size={12}
                color={pwReqs.match ? '#22C55E' : '#EF4444'}
              />
              <Text
                style={{
                  marginLeft: 5, fontSize: 11,
                  color: pwReqs.match ? '#15803D' : '#EF4444',
                  fontFamily: 'Inter_400Regular',
                }}>
                {pwReqs.match ? 'Passwords match' : 'Passwords do not match'}
              </Text>
            </View>
          )}

          {touched.confirmPassword && errors.confirmPassword && !confirmPassword.length && (
            <Text className="mt-1 font-inter text-xs text-red-500">{errors.confirmPassword}</Text>
          )}
        </View>

        <Button
          label={isLoading ? 'Creating account...' : 'Create Account'}
          disabled={isLoading}
          onPress={async () => {
            if (!validate()) return;
            setIsLoading(true);
            setGlobalError(null);
            try {
              await auth.register({
                email,
                password,
                full_name: `${firstName} ${lastName}`.trim(),
              });
              // Success, now go to location to complete setup
              router.push('/signup-location');
            } catch (err: any) {
              const msg = err?.message?.toLowerCase() || '';
              if (msg.includes('already registered') || msg.includes('already exists')) {
                setGlobalError('This email is already registered. Please log in instead.');
              } else {
                setGlobalError(err?.message || 'Failed to create account.');
              }
            } finally {
              setIsLoading(false);
            }
          }}
        />
      </ScrollView>
    </Screen>
  );
}

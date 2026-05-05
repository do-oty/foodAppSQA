import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, Vibration, View, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';

type FieldName = 'addressLine1' | 'city' | 'province' | 'zipCode';

const provincesData = require('philippines/provinces.json') as { name: string; key: string }[];
const citiesData = require('philippines/cities.json') as { name: string; province: string }[];
const sortedProvinces = [...provincesData].sort((a, b) => a.name.localeCompare(b.name));

function buildGroupedByLetter(items: string[]) {
  const groups: Record<string, string[]> = {};

  items.forEach((item) => {
    const letter = item[0]?.toUpperCase() ?? '#';
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(item);
  });

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, values]) => ({
      letter,
      values: values.sort((a, b) => a.localeCompare(b)),
    }));
}

export default function SignupLocationScreen() {
  const router = useRouter();
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [gpsMarked, setGpsMarked] = useState(false);
  const [showProvinceOptions, setShowProvinceOptions] = useState(false);
  const [showCityOptions, setShowCityOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const provinceList = sortedProvinces.map((p) => p.name);
  const provinceGrouped = buildGroupedByLetter(provinceList);
  const selectedProvinceKey = sortedProvinces.find((p) => p.name === province)?.key;
  const cityNamesRaw = selectedProvinceKey
    ? citiesData.filter((item) => item.province === selectedProvinceKey).map((item) => item.name)
    : [];
  const cityGrouped = buildGroupedByLetter(cityNamesRaw);

  const validate = () => {
    const nextErrors: Partial<Record<FieldName, string>> = {};
    if (!addressLine1.trim()) nextErrors.addressLine1 = 'Address line 1 is required.';
    else if (addressLine1.trim().length < 5) nextErrors.addressLine1 = 'Address must be at least 5 characters.';
    if (!province.trim()) nextErrors.province = 'Province is required.';
    if (!city.trim()) nextErrors.city = 'City is required.';
    if (!zipCode.trim()) nextErrors.zipCode = 'ZIP is required.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      Vibration.vibrate(140);
      return false;
    }
    return true;
  };

  const inputClasses = (field: FieldName) =>
    `h-[56px] w-full rounded-2xl border px-4 ${errors[field] ? 'border-red-500' : 'border-violet-200'}`;

  return (
    <Screen>
      <ScrollView
        className="flex-1 bg-white"
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 28 }}>
        
        <View className="mb-2 flex-row items-center">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-50">
            <FontAwesome name="arrow-left" size={20} color="#9CA3AF" />
          </Pressable>
        </View>

        <Text className="mb-2 font-inter-bold text-3xl text-violet-900">Address</Text>
        <Text className="mb-5 font-inter-light text-sm text-violet-700">
          Add your location details before finishing setup.
        </Text>

        {globalError && (
          <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 flex-row items-center">
            <FontAwesome name="exclamation-circle" size={16} color="#B91C1C" />
            <Text className="ml-2 flex-1 font-inter-bold text-sm text-red-800">{globalError}</Text>
            <Pressable onPress={() => setGlobalError(null)}>
              <FontAwesome name="times" size={14} color="#B91C1C" />
            </Pressable>
          </View>
        )}

        <View className="mb-4">
          <View className={inputClasses('addressLine1')}>
            <View className="h-full flex-row items-center">
              <FontAwesome name="map-marker" size={18} color={errors.addressLine1 ? '#EF4444' : '#7C3AED'} />
              <TextInput
                value={addressLine1}
                onChangeText={(value) => {
                  setAddressLine1(value);
                  if (errors.addressLine1) setErrors((prev) => ({ ...prev, addressLine1: undefined }));
                }}
                placeholder="Address line 1"
                placeholderTextColor="#8B79A9"
                className="h-full flex-1 pl-3 font-inter text-[17px] text-violet-950"
              />
            </View>
          </View>
        </View>

        <View className="mb-4 h-[64px] rounded-2xl border border-violet-200 px-4">
          <TextInput
            value={addressLine2}
            onChangeText={setAddressLine2}
            placeholder="Address line 2 (optional)"
            placeholderTextColor="#8B79A9"
            className="h-full px-1 font-inter text-[17px] text-violet-950"
          />
        </View>

        <View className="mb-4">
          <Pressable
            onPress={() => {
              setShowProvinceOptions((prev) => !prev);
              setShowCityOptions(false);
            }}
            style={!showProvinceOptions ? { borderBottomColor: '#A78BFA', borderBottomWidth: 1.2 } : undefined}
            className={`${inputClasses('province')} ${showProvinceOptions ? 'rounded-b-none border-b-0' : ''}`}>
            <View className="h-full flex-row items-center justify-between">
              <Text className={`font-inter text-[17px] ${province ? 'text-violet-950' : 'text-violet-400'}`}>
                {province || 'Select province'}
              </Text>
              <FontAwesome name={showProvinceOptions ? 'chevron-up' : 'chevron-down'} size={14} color="#7C3AED" />
            </View>
          </Pressable>
          {showProvinceOptions && (
            <View className="max-h-64 overflow-hidden rounded-b-2xl border border-violet-200 border-t-0 bg-white">
              <View className="border-t border-violet-200" />
              <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 10 }}
                showsVerticalScrollIndicator={false}>
                {provinceGrouped.map((group) => (
                  <View key={group.letter} className="mb-2 flex-row px-2 pt-2">
                    <Text className="w-9 pt-2 font-inter-bold text-base text-violet-600">{group.letter}</Text>
                    <View className="flex-1">
                      {group.values.map((item) => (
                        <Pressable
                          key={item}
                          onPress={() => {
                            setProvince(item);
                            setCity('');
                            setShowProvinceOptions(false);
                            if (errors.province) setErrors((prev) => ({ ...prev, province: undefined }));
                          }}
                          className="w-full rounded-xl px-2 py-2.5 active:bg-violet-50">
                          <View className="flex-row items-center justify-between">
                            <Text className="font-inter text-base text-violet-900">{item}</Text>
                            {province === item && <FontAwesome name="check" size={14} color="#7C3AED" />}
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View className="mb-4">
          <Pressable
            onPress={() => {
              if (!province) return;
              setShowCityOptions((prev) => !prev);
              setShowProvinceOptions(false);
            }}
            style={!showCityOptions ? { borderBottomColor: '#A78BFA', borderBottomWidth: 1.2 } : undefined}
            className={`${inputClasses('city')} ${showCityOptions ? 'rounded-b-none border-b-0' : ''}`}>
            <View className="h-full flex-row items-center justify-between">
              <Text className={`font-inter text-[17px] ${city ? 'text-violet-950' : 'text-violet-400'}`}>
                {city || 'Select city'}
              </Text>
              <FontAwesome name={showCityOptions ? 'chevron-up' : 'chevron-down'} size={14} color="#7C3AED" />
            </View>
          </Pressable>
          {showCityOptions && province && (
            <View className="max-h-64 overflow-hidden rounded-b-2xl border border-violet-200 border-t-0 bg-white">
              <View className="border-t border-violet-200" />
              <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 10 }}
                showsVerticalScrollIndicator={false}>
                {cityGrouped.map((group) => (
                  <View key={group.letter} className="mb-2 flex-row px-2 pt-2">
                    <Text className="w-9 pt-2 font-inter-bold text-base text-violet-600">{group.letter}</Text>
                    <View className="flex-1">
                      {group.values.map((item) => (
                        <Pressable
                          key={item}
                          onPress={() => {
                            setCity(item);
                            setShowCityOptions(false);
                            if (errors.city) setErrors((prev) => ({ ...prev, city: undefined }));
                          }}
                          className="w-full rounded-xl px-2 py-2.5 active:bg-violet-50">
                          <View className="flex-row items-center justify-between">
                            <Text className="font-inter text-base text-violet-900">{item}</Text>
                            {city === item && <FontAwesome name="check" size={14} color="#7C3AED" />}
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          {!province && <Text className="mt-2 font-inter-light text-xs text-violet-500">Select province first.</Text>}
        </View>

        <View className="mb-4">
          <View className={inputClasses('zipCode')}>
            <View className="h-full flex-row items-center">
              <FontAwesome name="hashtag" size={17} color={errors.zipCode ? '#EF4444' : '#7C3AED'} />
              <TextInput
                value={zipCode}
                onChangeText={(value) => {
                  setZipCode(value);
                  if (errors.zipCode) setErrors((prev) => ({ ...prev, zipCode: undefined }));
                }}
                placeholder="ZIP code"
                keyboardType="number-pad"
                placeholderTextColor="#8B79A9"
                className="h-full flex-1 pl-3 font-inter text-[17px] text-violet-950"
              />
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => {
            setIsLocating(true);
            setGlobalError(null);
            // Simulate GPS detection delay and potential error
            setTimeout(() => {
              setIsLocating(false);
              const success = Math.random() > 0.2; // 80% success rate for simulation
              if (success) {
                setGpsMarked(true);
                // Pre-fill some data if success
                if (!addressLine1) setAddressLine1('123 Simulated GPS St.');
                if (!zipCode) setZipCode('1000');
              } else {
                setGlobalError('Location services unavailable. Please check your GPS settings or enter address manually.');
                Vibration.vibrate([0, 80, 50, 80]);
              }
            }, 1200);
          }}
          disabled={isLocating}
          className={`mb-5 rounded-2xl border p-4 ${isLocating ? 'border-violet-100 bg-violet-50 opacity-60' : gpsMarked ? 'border-violet-600 bg-violet-100' : 'border-violet-200 bg-violet-50'}`}>
          <View className="flex-row items-center">
            {isLocating ? (
              <ActivityIndicator size="small" color="#6D28D9" />
            ) : (
              <FontAwesome name="crosshairs" size={16} color="#6D28D9" />
            )}
            <Text className="ml-2 font-inter-semibold text-violet-900">
              {isLocating ? 'Detecting location...' : 'Use Current Location'}
            </Text>
          </View>
          <Text className="mt-1 font-inter-light text-sm text-violet-700">
            {isLocating ? 'Connecting to satellites...' : gpsMarked ? 'GPS location selected.' : 'Tap to auto-fill address using GPS.'}
          </Text>
        </Pressable>

        <Button
          label={isLoading ? 'Saving...' : 'Finish Setup'}
          disabled={isLoading}
          onPress={async () => {
            if (!validate()) return;
            setIsLoading(true);
            try {
              const { api } = require('../services/api');
              await api.createAddress({
                label: 'Home',
                street_address: addressLine1 + (addressLine2 ? `, ${addressLine2}` : ''),
                city: city,
                state: province,
                postal_code: zipCode,
                latitude: 14.5995, // Default Manila lat
                longitude: 120.9842, // Default Manila lng
                is_default: true,
              });
              router.replace('/(tabs)/home');
            } catch (err: any) {
              console.error(err);
              
              // Handle field-specific API validation errors
              if (err.details && Array.isArray(err.details)) {
                const apiErrors: any = {};
                err.details.forEach((d: any) => {
                  // Map API field names to our internal state names
                  let field = d.field;
                  if (field === 'street_address') field = 'addressLine1';
                  if (field === 'postal_code') field = 'zipCode';
                  if (field === 'state') field = 'province';
                  apiErrors[field] = d.message;
                });
                setErrors(prev => ({ ...prev, ...apiErrors }));
                Vibration.vibrate(140);
              } else {
                setGlobalError(err.message || 'We couldn\'t save your address. Please try again or skip for now.');
                Vibration.vibrate(140);
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


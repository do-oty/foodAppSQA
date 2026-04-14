import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, Vibration, View } from 'react-native';
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
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
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
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 28 }}>
        <Text className="mb-2 font-inter-bold text-3xl text-violet-900">Address</Text>
        <Text className="mb-5 font-inter-light text-sm text-violet-700">
          Add your location details before finishing setup.
        </Text>

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
          onPress={() => setGpsMarked((prev) => !prev)}
          className={`mb-5 rounded-2xl border p-4 ${gpsMarked ? 'border-violet-600 bg-violet-100' : 'border-violet-200 bg-violet-50'}`}>
          <View className="flex-row items-center">
            <FontAwesome name="crosshairs" size={16} color="#6D28D9" />
            <Text className="ml-2 font-inter-semibold text-violet-900">Temporary GPS Location Box</Text>
          </View>
          <Text className="mt-1 font-inter-light text-sm text-violet-700">
            {gpsMarked ? 'GPS location selected (temporary).' : 'Tap to simulate selecting GPS location.'}
          </Text>
        </Pressable>

        <Button
          label="Next"
          onPress={() => {
            if (!validate()) return;
            router.replace('/(tabs)/home');
          }}
        />
      </ScrollView>
    </Screen>
  );
}


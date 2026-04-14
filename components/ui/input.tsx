import { Text, TextInput, View } from 'react-native';

type InputProps = {
  label: string;
  placeholder: string;
  secureTextEntry?: boolean;
};

export function Input({ label, placeholder, secureTextEntry = false }: InputProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 font-inter-semibold text-sm text-violet-900">{label}</Text>
      <TextInput
        secureTextEntry={secureTextEntry}
        placeholder={placeholder}
        placeholderTextColor="#8B79A9"
        className="h-12 rounded-2xl border border-violet-200 bg-white px-4 font-inter text-base text-violet-950"
      />
    </View>
  );
}


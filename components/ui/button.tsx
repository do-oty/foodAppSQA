import { Pressable, Text } from 'react-native';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
};

export function Button({ label, onPress, variant = 'primary' }: ButtonProps) {
  const classes =
    variant === 'primary'
      ? 'bg-violet-600 active:bg-violet-700'
      : 'bg-white border border-violet-300 active:bg-violet-50';
  const textClasses = variant === 'primary' ? 'text-white' : 'text-violet-700';

  return (
    <Pressable onPress={onPress} className={`h-12 items-center justify-center rounded-2xl ${classes}`}>
      <Text className={`font-inter-semibold text-base ${textClasses}`}>{label}</Text>
    </Pressable>
  );
}


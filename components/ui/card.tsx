import { ReactNode } from 'react';
import { View } from 'react-native';

type CardProps = {
  children: ReactNode;
};

export function Card({ children }: CardProps) {
  return <View className="rounded-3xl border border-violet-200 bg-violet-50 p-5">{children}</View>;
}


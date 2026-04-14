import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const items = [
  { id: '1', title: 'Chicken Inasal', rating: '4.8', fee: 'P39', promo: '20% OFF' },
  { id: '2', title: 'Beef Tapa Bowl', rating: '4.7', fee: 'P49', promo: 'Free Drink' },
  { id: '3', title: 'Spicy Ramen Set', rating: '4.9', fee: 'P59', promo: 'Buy 1 Take 1' },
  { id: '4', title: 'Burger Steak Meal', rating: '4.8', fee: 'P45', promo: '10% OFF' },
  { id: '5', title: 'Pork Sisig Rice', rating: '4.6', fee: 'P35', promo: 'Free Delivery' },
  { id: '6', title: 'Seafood Palabok', rating: '4.7', fee: 'P55', promo: 'Bundle Promo' },
];

export default function OrderAgainScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom', 'left', 'right']}>
      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 28 }}>
        <Text className="mb-1 font-inter-bold text-2xl text-violet-900">Order Again</Text>
        <Text className="mb-4 font-inter-light text-sm text-violet-500">
          Static hardcoded list. Prepared for infinite scroll next.
        </Text>

        {items.map((item) => (
          <View key={item.id} className="mb-3 rounded-3xl border border-violet-200 bg-white p-3">
            <View className="h-28 rounded-2xl bg-violet-100" />
            <Text className="mt-3 font-inter-bold text-base text-violet-900">{item.title}</Text>
            <Text className="mt-1 font-inter-light text-sm text-violet-500">
              ⭐ {item.rating}  •  Delivery {item.fee}  •  {item.promo}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}


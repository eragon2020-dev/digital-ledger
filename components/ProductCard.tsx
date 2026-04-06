import { View, Text, Image, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Product } from '@/types';
import { MaterialIcons } from '@expo/vector-icons';

interface ProductCardProps {
  product: Product;
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function ProductCard({ product, selected = false, onPress, style }: ProductCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: colors.surfaceContainerLowest,
          borderRadius: 24,
          padding: 16,
          borderWidth: 2,
          borderColor: selected ? colors.primary : 'transparent',
        },
        style,
      ]}
    >
      <View
        style={{
          aspectRatio: 1,
          borderRadius: 16,
          backgroundColor: colors.surfaceContainer,
          marginBottom: 12,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <MaterialIcons
            name="image"
            size={40}
            color={colors.outline}
          />
        )}
        {product.stock > 0 && (
          <View
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              backgroundColor: colors.primary,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.white }}>
              {product.stock} left
            </Text>
          </View>
        )}
        {selected && (
          <View
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: `${colors.primary}33`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 32, color: colors.white }}>✓</Text>
          </View>
        )}
      </View>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '700',
          color: colors.onSurface,
          marginBottom: 4,
          fontFamily: 'Inter',
        }}
        numberOfLines={2}
      >
        {product.name}
      </Text>
      <Text style={{ fontSize: 14, color: colors.secondary, fontFamily: 'Inter' }}>
        MVR {product.price.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );
}

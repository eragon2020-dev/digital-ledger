import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'receipt-long' as const,
    title: 'Point of Sale',
    subtitle: 'Fast & Easy Checkout',
    description: 'Create sales instantly with our streamlined POS. Add products, apply taxes, and accept Cash, Transfer, or Credit payments in seconds.',
    color: '#0EA5E9',
  },
  {
    icon: 'inventory-2' as const,
    title: 'Stock Control',
    subtitle: 'Real-Time Inventory',
    description: 'Track products and services with live stock levels. Get low-stock alerts, manage buy/sell prices, and auto-record purchase expenses. Products with sales history are protected from accidental deletion.',
    color: '#6366F1',
  },
  {
    icon: 'account-balance-wallet' as const,
    title: 'Finance Tracker',
    subtitle: 'Income & Expenses',
    description: 'Monitor all cash flow in one place. Track sales income, manual entries, stock costs, rent, utilities, and more with date filtering.',
    color: '#10B981',
  },
  {
    icon: 'bar-chart' as const,
    title: 'Smart Reports',
    subtitle: 'Monthly & Yearly Insights',
    description: 'View sales trends, top-selling products, profit margins, and yearly summaries. Make informed decisions with clear visual data.',
    color: '#F59E0B',
  },
  {
    icon: 'cloud' as const,
    title: 'Backup & Restore',
    subtitle: 'Your Data, Always Safe',
    description: 'Export all data as ZIP files for safekeeping. Restore from backup anytime. Switch between multiple businesses seamlessly.',
    color: '#0EA5E9',
  },
];

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * width,
        animated: true,
      });
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    } catch (e) {
      console.error('Failed to save onboarding state', e);
    }
    router.replace('/(tabs)' as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      {/* Skip Button */}
      <TouchableOpacity
        style={styles.skipButton}
        activeOpacity={0.7}
        onPress={handleSkip}
      >
        <Text style={[styles.skipText, { color: colors.secondary }]}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, index) => (
          <View key={index} style={styles.slide}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={[styles.iconBox, { backgroundColor: slide.color }]}>
                <MaterialIcons name={slide.icon} size={48} color="#fff" />
              </View>
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.onSurface }]}>{slide.title}</Text>
            <Text style={[styles.subtitle, { color: slide.color }]}>{slide.subtitle}</Text>

            {/* Description */}
            <Text style={[styles.description, { color: colors.secondary }]}>{slide.description}</Text>

            {/* Pagination Dots */}
            <View style={styles.pagination}>
              {SLIDES.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === currentIndex ? slide.color : colors.outline,
                      width: i === currentIndex ? 24 : 8,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        ))}
      </Animated.ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
          onPress={handleNext}
        >
          <Text style={styles.ctaText}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <MaterialIcons
            name={currentIndex === SLIDES.length - 1 ? 'rocket-launch' : 'arrow-forward'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  slide: {
    width,
    flex: 1,
    paddingHorizontal: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
});

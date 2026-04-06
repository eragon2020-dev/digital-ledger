import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem('hasSeenOnboarding');
        if (!hasSeen) {
          router.replace('/onboarding' as any);
        } else {
          router.replace('/(tabs)' as any);
        }
      } catch {
        router.replace('/onboarding' as any);
      }
    };
    check();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
      <ActivityIndicator size="large" color="#0EA5E9" />
    </View>
  );
}

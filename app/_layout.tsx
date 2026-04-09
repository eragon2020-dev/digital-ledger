import { useEffect, useState, useCallback } from 'react';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';

import { DatabaseProvider, useDatabase } from '@/providers/DatabaseProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import { useFarumaFont } from '@/hooks/use-font';
import { getAdaptiveFontSize } from '@/utils/scaling';

export const unstable_settings = {
  anchor: '(tabs)',
  initialRouteName: 'onboarding',
};

function SafeAreaWrapper({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: '#F8FAFC' }}>
      {children}
    </View>
  );
}

function AppContent() {
  const { isReady, error } = useDatabase();
  const fontLoaded = useFarumaFont();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isReady && fontLoaded && hasSeenOnboarding === null) {
      AsyncStorage.getItem('hasSeenOnboarding').then((value) => {
        const seen = value === 'true';
        setHasSeenOnboarding(seen);
        if (!seen && pathname !== '/onboarding') {
          router.replace('/onboarding');
        } else if (seen && pathname === '/onboarding') {
          router.replace('/(tabs)');
        }
      });
    }
  }, [isReady, fontLoaded, hasSeenOnboarding]);

  const lightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#0EA5E9',
      background: '#F8FAFC',
      card: '#FFFFFF',
      text: '#1A1C1E',
      border: 'rgba(0,0,0,0.05)',
    },
  };

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: 24 }}>
        <Text style={{ fontSize: getAdaptiveFontSize(18), fontWeight: '700', color: '#F43F5E', marginBottom: 8 }}>Error</Text>
        <Text style={{ fontSize: getAdaptiveFontSize(14), color: '#535F70', textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={lightTheme}>
      <Stack>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sale-detail" options={{ headerShown: false }} />
        <Stack.Screen name="new-sale" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="business-settings" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
      <StatusBar style="dark" translucent />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <SafeAreaProvider>
        <SafeAreaWrapper>
          <DatabaseProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </DatabaseProvider>
        </SafeAreaWrapper>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

import { Tabs } from 'expo-router';
import React from 'react';
import { TouchableOpacity, Platform, View, Text } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getAdaptiveFontSize } from '@/utils/scaling';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const tabBarBg = Platform.OS === 'web' ? 'rgba(248, 250, 252, 0.95)' : `${colors.surfaceContainerLowest}F2`;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: colors.secondary,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: tabBarBg,
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          height: 72,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 8,
          paddingHorizontal: 8,
          borderRadius: 24,
          marginHorizontal: 16,
          marginBottom: Platform.OS === 'ios' ? 28 : 12,
        },
        tabBarLabelStyle: {
          fontSize: getAdaptiveFontSize(10),
          fontWeight: '600',
          marginTop: 4,
        },
      }}
      tabBar={({ state, descriptors, navigation }) => (
        <View style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 28 : 12,
          left: 16,
          right: 16,
          backgroundColor: tabBarBg,
          borderRadius: 24,
          flexDirection: 'row',
          height: 72,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 8,
          paddingHorizontal: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
        }}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const labels: Record<string, string> = {
              index: 'Home',
              sales: 'Sales',
              finance: 'Finance',
              inventory: 'Stock',
              reports: 'Reports',
            };
            const label = labels[route.name] || route.name;
            const isFocused = state.index === index;
            const icon = options.tabBarIcon?.({
              color: isFocused ? '#FFFFFF' : colors.secondary,
              focused: isFocused,
              size: 24,
            });

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingVertical: 8,
                  marginHorizontal: 4,
                  borderRadius: 20,
                  backgroundColor: isFocused ? '#0EA5E9' : 'transparent',
                }}
              >
                {icon}
                <Text style={{
                  fontSize: getAdaptiveFontSize(10),
                  fontWeight: '600',
                  marginTop: 4,
                  color: isFocused ? '#FFFFFF' : colors.secondary,
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="home" size={focused ? 26 : 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="receipt-long" size={focused ? 26 : 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Finance',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="account-balance-wallet" size={focused ? 26 : 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Stock',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="inventory-2" size={focused ? 26 : 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="bar-chart" size={focused ? 26 : 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

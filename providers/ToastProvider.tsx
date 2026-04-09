import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAdaptiveFontSize } from '@/utils/scaling';

interface ToastData {
  message: string;
  actionLabel: string;
  onAction: () => void;
  duration: number;
}

interface ToastContextType {
  showToast: (data: ToastData) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [toast, setToast] = useState<ToastData | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [fadeAnim]);

  const showToast = useCallback((data: ToastData) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(data);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    timerRef.current = setTimeout(() => {
      hideToast();
    }, data.duration);
  }, [fadeAnim, hideToast]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              backgroundColor: colors.surfaceContainerHigh,
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={[styles.toastMessage, { color: colors.onSurface }]}>{toast.message}</Text>
          <TouchableOpacity
            style={[styles.toastAction, { backgroundColor: colors.primary }]}
            activeOpacity={0.7}
            onPress={() => {
              toast.onAction();
              hideToast();
            }}
          >
            <MaterialIcons name="undo" size={16} color={colors.white} />
            <Text style={styles.toastActionText}>{toast.actionLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 96,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  toastMessage: {
    flex: 1,
    fontSize: getAdaptiveFontSize(14),
    fontWeight: '500',
    marginRight: 12,
  },
  toastAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  toastActionText: {
    color: '#FFFFFF',
    fontSize: getAdaptiveFontSize(13),
    fontWeight: '700',
  },
});

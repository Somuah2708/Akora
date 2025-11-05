import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

export type ToastType = 'success' | 'error' | 'info';

type ToastContextValue = {
  show: (message: string, opts?: { type?: ToastType; durationMs?: number }) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<ToastType>('success');
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 12, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) {
        setMessage(null);
      }
    });
  }, [opacity, translateY]);

  const show = useCallback((msg: string, opts?: { type?: ToastType; durationMs?: number }) => {
    const duration = opts?.durationMs ?? 2000;
    setType(opts?.type ?? 'success');
    setMessage(msg);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    // Reset values before animating in
    opacity.setValue(0);
    translateY.setValue(12);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
    hideTimer.current = setTimeout(hide, duration);
  }, [hide, opacity, translateY]);

  const value = useMemo(() => ({ show }), [show]);

  const bgStyle = useMemo(() => {
    switch (type) {
      case 'error':
        return { backgroundColor: '#DC2626' };
      case 'info':
        return { backgroundColor: '#374151' };
      case 'success':
      default:
        return { backgroundColor: '#16A34A' };
    }
  }, [type]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <View pointerEvents="none" style={styles.overlay}>
          <Animated.View style={[styles.toast, bgStyle, { opacity, transform: [{ translateY }] }]}>
            <Text style={styles.text}>{message}</Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toast: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    maxWidth: '90%',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});

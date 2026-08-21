import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "success" | "error" | "info";

interface ToastState {
  message: string;
  type: ToastType;
  id: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICON_MAP: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "alert-circle",
  info: "information-circle",
};

const COLOR_MAP: Record<ToastType, { bg: string; text: string; icon: string }> = {
  success: { bg: "#10B981", text: "#fff", icon: "#fff" },
  error: { bg: "#EF4444", text: "#fff", icon: "#fff" },
  info: { bg: "#3B82F6", text: "#fff", icon: "#fff" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const idRef = useRef(0);
  const insets = useSafeAreaInsets();

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = ++idRef.current;
    setToast({ message, type, id });
    opacity.setValue(0);
    translateY.setValue(-20);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 300, useNativeDriver: true }),
      ]).start(() => setToast(null));
    }, 2500);
  }, [opacity, translateY]);

  const topOffset = Platform.OS === "web" ? 67 + 12 : insets.top + 12;
  const colors = toast ? COLOR_MAP[toast.type] : COLOR_MAP.info;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastContainer,
            { top: topOffset, opacity, transform: [{ translateY }] },
          ]}
        >
          <View style={[styles.toast, { backgroundColor: colors.bg }]}>
            <Ionicons name={ICON_MAP[toast.type]} size={18} color={colors.icon} />
            <Text style={[styles.toastText, { color: colors.text }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    maxWidth: 400,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
    lineHeight: 20,
  },
});

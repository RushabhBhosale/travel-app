import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { shadow } from "../../theme";

type ToastData = { id: number; type: "success" | "error" | "info"; message: string };

let push: (t: Omit<ToastData, "id">) => void = () => {};

/** Fire-and-forget notifications usable from anywhere, including non-React code. */
export const toast = {
  success: (message: string) => push({ type: "success", message }),
  error: (message: string) => push({ type: "error", message }),
  info: (message: string) => push({ type: "info", message }),
};

const ICONS = {
  success: { name: "checkmark-circle", color: "#22C55E" },
  error: { name: "alert-circle", color: "#F87171" },
  info: { name: "information-circle", color: "#93C5FD" },
} as const;

export const ToastHost = () => {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<ToastData | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    push = (t) => {
      if (t.type === "error") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      if (t.type === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCurrent({ ...t, id: Date.now() });
    };
    return () => {
      push = () => {};
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    clearTimeout(timer.current);
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 16 }).start();
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setCurrent(null));
    }, current.type === "error" ? 3800 : 2400);
    return () => clearTimeout(timer.current);
  }, [current, anim]);

  if (!current) return null;
  const icon = ICONS[current.type];
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        top: insets.top + 8,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
        zIndex: 1000,
      }}
    >
      <View className="flex-row items-center rounded-2xl bg-slate-900 px-4 py-3.5" style={shadow(3)}>
        <Ionicons name={icon.name} size={20} color={icon.color} />
        <Text className="ml-2.5 flex-1 text-sm font-medium text-white">{current.message}</Text>
      </View>
    </Animated.View>
  );
};

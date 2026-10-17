import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Keyboard, Modal, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import IconButton from "./IconButton";

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Fraction of the screen height; omit to size to content. */
  height?: number;
  footer?: React.ReactNode;
};

const SCREEN_H = Dimensions.get("window").height;

/** Bottom sheet with a fading backdrop and a spring slide-in. */
const Sheet = ({ visible, onClose, title, subtitle, children, height, footer }: Props) => {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [keyboard, setKeyboard] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  // Sit above the keyboard and shrink so footer buttons stay reachable.
  useEffect(() => {
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", (e) => setKeyboard(e.endCoordinates.height));
    const hide = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 180 }).start();
    } else if (mounted) {
      Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setMounted(false));
    }
  }, [visible, mounted, progress]);

  if (!mounted) return null;

  const available = SCREEN_H - keyboard - insets.top - 12;
  const maxHeight = Math.min(SCREEN_H * 0.92, available);

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, backgroundColor: "rgba(2,6,23,0.45)", opacity: progress }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: keyboard }} pointerEvents="box-none">
        <Animated.View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            height: height ? Math.min(SCREEN_H * height, maxHeight) : undefined,
            maxHeight,
            paddingBottom: keyboard ? 12 : Math.max(insets.bottom, 16),
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_H * 0.6, 0] }) }],
          }}
        >
          <View className="items-center pt-2.5">
            <View className="h-1.5 w-10 rounded-full bg-slate-200" />
          </View>
          {(title || subtitle) && (
            <View className="flex-row items-start px-5 pb-2 pt-3">
              <View className="flex-1 pr-3">
                {title && <Text className="text-lg font-bold text-slate-900">{title}</Text>}
                {subtitle && <Text className="mt-0.5 text-[13px] text-slate-500">{subtitle}</Text>}
              </View>
              <IconButton name="close" size={18} onPress={onClose} className="h-8 w-8" />
            </View>
          )}
          <View style={height ? { flex: 1 } : { flexShrink: 1 }}>{children}</View>
          {footer && <View className="px-5 pt-3">{footer}</View>}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default Sheet;

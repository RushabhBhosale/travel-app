import React from "react";
import { ActivityIndicator, Pressable, PressableProps, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "../../theme";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "ai" | "dark";

const VARIANTS: Record<Variant, { container: string; text: string; icon: string; spinner: string }> = {
  primary: { container: "bg-brand", text: "text-white", icon: "#fff", spinner: "#fff" },
  secondary: { container: "bg-brand-50", text: "text-brand-600", icon: colors.brandDark, spinner: colors.brand },
  outline: { container: "bg-white border border-slate-200", text: "text-slate-800", icon: colors.text, spinner: colors.text },
  ghost: { container: "bg-transparent", text: "text-slate-700", icon: colors.text, spinner: colors.text },
  danger: { container: "bg-red-50", text: "text-red-600", icon: colors.danger, spinner: colors.danger },
  ai: { container: "bg-violet-600", text: "text-white", icon: "#fff", spinner: "#fff" },
  dark: { container: "bg-slate-900", text: "text-white", icon: "#fff", spinner: "#fff" },
};

type Props = Omit<PressableProps, "children"> & {
  title: string;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  loading?: boolean;
  className?: string;
  haptic?: boolean;
};

const SIZES = {
  sm: { box: "h-9 px-3.5 rounded-full", text: "text-[13px]", icon: 15 },
  md: { box: "h-12 px-5 rounded-2xl", text: "text-[15px]", icon: 18 },
  lg: { box: "h-14 px-6 rounded-2xl", text: "text-base", icon: 20 },
};

const Button = ({ title, variant = "primary", size = "md", icon, loading, disabled, className = "", haptic = true, onPress, ...rest }: Props) => {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={(e) => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      className={`flex-row items-center justify-center ${s.box} ${v.container} ${inactive ? "opacity-60" : ""} active:opacity-80 ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.spinner} />
      ) : (
        <View className="flex-row items-center">
          {icon && <Ionicons name={icon} size={s.icon} color={v.icon} style={{ marginRight: 6 }} />}
          <Text className={`font-semibold ${s.text} ${v.text}`}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
};

export default Button;

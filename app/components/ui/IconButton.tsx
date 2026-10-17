import React from "react";
import { Pressable, PressableProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, shadow } from "../../theme";

type Props = Omit<PressableProps, "children"> & {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  color?: string;
  /** "glass" sits on top of photos, "soft" on light backgrounds. */
  tone?: "glass" | "soft" | "plain" | "brand";
  className?: string;
};

const TONES = {
  glass: "bg-white/90",
  soft: "bg-slate-100",
  plain: "bg-transparent",
  brand: "bg-brand",
};

const IconButton = ({ name, size = 20, color = colors.ink, tone = "soft", className = "", onPress, ...rest }: Props) => (
  <Pressable
    accessibilityRole="button"
    hitSlop={8}
    onPress={(e) => {
      Haptics.selectionAsync().catch(() => {});
      onPress?.(e);
    }}
    className={`h-10 w-10 items-center justify-center rounded-full ${TONES[tone]} active:opacity-70 ${className}`}
    style={tone === "glass" ? shadow(1) : undefined}
    {...rest}
  >
    <Ionicons name={name} size={size} color={tone === "brand" ? "#fff" : color} />
  </Pressable>
);

export default IconButton;

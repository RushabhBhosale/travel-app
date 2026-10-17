import React, { memo } from "react";
import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "../../theme";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  color?: string;
  className?: string;
};

const Chip = ({ label, selected, onPress, icon, color = colors.brand, className = "" }: Props) => (
  <Pressable
    onPress={() => {
      Haptics.selectionAsync().catch(() => {});
      onPress?.();
    }}
    className={`h-9 flex-row items-center rounded-full border px-3.5 active:opacity-70 ${className}`}
    style={{
      backgroundColor: selected ? color : "#fff",
      borderColor: selected ? color : colors.border,
    }}
  >
    {icon && <Ionicons name={icon} size={14} color={selected ? "#fff" : colors.muted} style={{ marginRight: 5 }} />}
    <Text className={`text-[13px] font-semibold ${selected ? "text-white" : "text-slate-700"}`}>{label}</Text>
  </Pressable>
);

export default memo(Chip);

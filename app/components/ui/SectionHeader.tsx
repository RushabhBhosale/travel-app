import React from "react";
import { Pressable, Text, View } from "react-native";

type Props = { title: string; subtitle?: string; action?: string; onAction?: () => void; className?: string };

const SectionHeader = ({ title, subtitle, action, onAction, className = "" }: Props) => (
  <View className={`mb-3 flex-row items-end justify-between ${className}`}>
    <View className="flex-1 pr-3">
      <Text className="text-xl font-bold tracking-tight text-slate-900">{title}</Text>
      {subtitle && <Text className="mt-0.5 text-[13px] text-slate-500">{subtitle}</Text>}
    </View>
    {action && (
      <Pressable hitSlop={8} onPress={onAction}>
        <Text className="text-sm font-semibold text-brand">{action}</Text>
      </Pressable>
    )}
  </View>
);

export default SectionHeader;

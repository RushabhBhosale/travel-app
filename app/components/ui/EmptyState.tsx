import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import Button from "./Button";

type Props = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle?: string;
  action?: { title: string; onPress: () => void; icon?: React.ComponentProps<typeof Ionicons>["name"] };
  compact?: boolean;
};

const EmptyState = ({ icon, title, subtitle, action, compact }: Props) => (
  <View className={`items-center ${compact ? "py-6" : "py-12"} px-6`}>
    <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-brand-50">
      <Ionicons name={icon} size={26} color={colors.brand} />
    </View>
    <Text className="text-center text-base font-bold text-slate-900">{title}</Text>
    {subtitle && <Text className="mt-1 text-center text-sm leading-5 text-slate-500">{subtitle}</Text>}
    {action && <Button title={action.title} icon={action.icon} size="sm" className="mt-4" onPress={action.onPress} />}
  </View>
);

export default EmptyState;

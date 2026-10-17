import React from "react";
import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import IconButton from "./IconButton";

type Props = { title?: string; subtitle?: string; right?: React.ReactNode; onBack?: () => void; back?: boolean };

const ScreenHeader = ({ title, subtitle, right, onBack, back = true }: Props) => {
  const navigation = useNavigation();
  return (
    <View className="flex-row items-center px-4 pb-2 pt-1">
      {back && <IconButton name="chevron-back" onPress={onBack ?? (() => navigation.goBack())} accessibilityLabel="Go back" />}
      <View className={`flex-1 ${back ? "ml-3" : ""}`}>
        {title && (
          <Text numberOfLines={1} className="text-lg font-bold text-slate-900">
            {title}
          </Text>
        )}
        {subtitle && (
          <Text numberOfLines={1} className="text-xs text-slate-500">
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
};

export default ScreenHeader;

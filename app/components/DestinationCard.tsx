import React, { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppImage from "./ui/AppImage";
import { shadow } from "../theme";
import type { Destination } from "../data/destinations";

type Props = { destination: Destination; onPress: () => void; size?: "tall" | "wide" | "list" };

const DestinationCard = ({ destination: d, onPress, size = "tall" }: Props) => {
  if (size === "list") {
    return (
      <Pressable onPress={onPress} className="mb-4 active:opacity-90" style={shadow(1)}>
        <AppImage source={d.image} scrim style={{ height: 200, borderRadius: 26 }}>
          <View className="absolute right-3 top-3 flex-row items-center rounded-full bg-white/90 px-2.5 py-1">
            <Ionicons name="calendar-outline" size={12} color="#0F172A" />
            <Text className="ml-1 text-[11px] font-bold text-slate-900">{d.bestTime}</Text>
          </View>
          <View className="absolute bottom-0 left-0 right-0 p-4">
            <Text className="text-xl font-bold text-white">{d.name}</Text>
            <View className="mt-0.5 flex-row items-center">
              <Ionicons name="location" size={12} color="#E2E8F0" />
              <Text className="ml-1 text-[13px] text-slate-200">{d.region}</Text>
            </View>
            <Text numberOfLines={1} className="mt-1 text-[13px] text-slate-100">
              {d.tagline}
            </Text>
          </View>
        </AppImage>
      </Pressable>
    );
  }

  const style = size === "wide" ? { width: 260, height: 170 } : { width: 156, height: 210 };
  return (
    <Pressable onPress={onPress} className="mr-3 active:opacity-90">
      <AppImage source={d.image} scrim style={[style, { borderRadius: 24 }]}>
        <View className="absolute bottom-0 left-0 right-0 p-3.5">
          <Text numberOfLines={1} className="text-base font-bold text-white">
            {d.name}
          </Text>
          <Text numberOfLines={1} className="text-xs text-slate-200">
            {size === "wide" ? d.tagline : d.region}
          </Text>
        </View>
      </AppImage>
    </Pressable>
  );
};

export default memo(DestinationCard);

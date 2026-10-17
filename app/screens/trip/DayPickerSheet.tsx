import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Sheet from "../../components/ui/Sheet";
import { tripDays } from "../../lib/format";
import { colors, dayColor } from "../../theme";
import type { Trip } from "../../lib/types";

type Props = { trip: Trip; visible: boolean; title: string; onClose: () => void; onPick: (date: string) => void };

const DayPickerSheet = ({ trip, visible, title, onClose, onPick }: Props) => (
  <Sheet visible={visible} onClose={onClose} title={title} subtitle="Choose a day">
    <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      {tripDays(trip).map((d) => {
        const count = trip.itinerary.find((i) => i.date === d.value)?.activities.length ?? 0;
        return (
          <Pressable key={d.value} onPress={() => onPick(d.value)} className="flex-row items-center border-b border-slate-100 py-3 active:opacity-60">
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: dayColor(d.index) }}>
              <Text className="text-sm font-bold text-white">{d.index + 1}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-slate-900">{d.label}</Text>
              <Text className="text-xs text-slate-500">{count ? `${count} planned` : "Nothing planned yet"}</Text>
            </View>
            <Ionicons name="add-circle" size={22} color={colors.brand} />
          </Pressable>
        );
      })}
    </ScrollView>
  </Sheet>
);

export default DayPickerSheet;

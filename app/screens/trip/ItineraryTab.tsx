import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import PlaceCard from "../../components/PlaceCard";
import Button from "../../components/ui/Button";
import { api } from "../../lib/api";
import { useTripMutation } from "../../lib/queries";
import { tripDays } from "../../lib/format";
import { colors, dayColor, shadow } from "../../theme";
import type { Trip } from "../../lib/types";
import type { RootNav } from "../../navigation/types";

type Props = {
  trip: Trip;
  onAddPlace: (date: string) => void;
  onAiPlan: (date?: string) => void;
  aiPlanning: string | boolean;
};

const DayTitle = ({ trip, date, title }: { trip: Trip; date: string; title?: string }) => {
  const [value, setValue] = useState(title ?? "");
  const save = useTripMutation(trip._id, (t: string) => api.setDayTitle(trip._id, date, t));
  return (
    <TextInput
      value={value}
      onChangeText={setValue}
      onEndEditing={() => value !== (title ?? "") && save.mutate(value.trim())}
      placeholder="Add a title, e.g. Old town & food walk"
      placeholderTextColor={colors.subtle}
      style={{ fontSize: 14, color: colors.muted, paddingVertical: 2 }}
    />
  );
};

const ItineraryTab = ({ trip, onAddPlace, onAiPlan, aiPlanning }: Props) => {
  const navigation = useNavigation<RootNav>();
  const removeActivity = useTripMutation(trip._id, ({ date, id }: { date: string; id: string }) => api.removeActivity(trip._id, date, id), {
    optimistic: (t, { date, id }) => ({
      ...t,
      itinerary: t.itinerary.map((d) => (d.date === date ? { ...d, activities: d.activities.filter((a) => a._id !== id) } : d)),
    }),
  });

  const days = tripDays(trip);
  const planningAll = aiPlanning === true;

  return (
    <View className="px-5 pt-4">
      <Pressable
        onPress={() => !aiPlanning && onAiPlan()}
        className="mb-6 flex-row items-center rounded-3xl bg-violet-50 p-4 active:opacity-80"
        style={{ borderWidth: 1, borderColor: "#DDD6FE" }}
      >
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-2xl bg-violet-600">
          {planningAll ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="sparkles" size={18} color="#fff" />}
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-violet-900">{planningAll ? "Planning your trip…" : "Auto-plan with AI"}</Text>
          <Text className="text-xs text-violet-700">
            {planningAll ? "Finding great places and grouping them by area. This can take up to a minute." : "Fills every day with places near each other"}
          </Text>
        </View>
        {!planningAll && <Ionicons name="chevron-forward" size={18} color={colors.ai} />}
      </Pressable>

      {days.map((d) => {
        const entry = trip.itinerary.find((i) => i.date === d.value);
        const activities = entry?.activities ?? [];
        const color = dayColor(d.index);
        const planningThis = aiPlanning === d.value;
        return (
          <View key={d.value} className="mb-7">
            <View className="mb-2 flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: color }}>
                <Text className="text-[15px] font-bold text-white">{d.index + 1}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-slate-900">{d.label}</Text>
                <DayTitle key={entry?.title} trip={trip} date={d.value} title={entry?.title} />
              </View>
              {activities.length > 0 && (
                <Pressable
                  hitSlop={8}
                  onPress={() => navigation.navigate("Map", { tripId: trip._id, day: d.value })}
                  className="h-9 w-9 items-center justify-center rounded-full bg-white"
                  style={shadow(1)}
                >
                  <Ionicons name="map-outline" size={17} color={colors.text} />
                </Pressable>
              )}
            </View>

            <View className="ml-5 border-l-2 pl-5" style={{ borderColor: `${color}33` }}>
              {activities.map((a, i) => (
                <PlaceCard
                  key={a._id ?? `${a.name}-${i}`}
                  place={a}
                  badge={{ text: `${i + 1}`, color }}
                  onRemove={a._id ? () => removeActivity.mutate({ date: d.value, id: a._id! }) : undefined}
                />
              ))}
              {activities.length === 0 && <Text className="mb-3 text-sm text-slate-400">Nothing planned for this day yet.</Text>}
              <View className="flex-row gap-2">
                <Button title="Add place" icon="add" size="sm" variant="outline" onPress={() => onAddPlace(d.value)} />
                <Button
                  title={planningThis ? "Planning…" : "Suggest for this day"}
                  icon="sparkles-outline"
                  size="sm"
                  variant="ghost"
                  loading={planningThis}
                  disabled={!!aiPlanning}
                  onPress={() => onAiPlan(d.value)}
                />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default ItineraryTab;

import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Button from "../../components/ui/Button";
import WeatherStrip from "../../components/WeatherStrip";
import { api } from "../../lib/api";
import { useTripMutation } from "../../lib/queries";
import { geocode } from "../../lib/places";
import { formatMoney, tripLength } from "../../lib/format";
import { colors, shadow } from "../../theme";
import type { Trip } from "../../lib/types";

const ESSENTIALS = ["Passport / ID", "Phone charger", "Power bank", "Medicines", "Toiletries", "Sunglasses", "Comfortable shoes", "Travel insurance"];

const Stat = ({ icon, value, label, color }: { icon: any; value: string; label: string; color: string }) => (
  <View className="mb-3 w-[48%] rounded-3xl bg-white p-4" style={shadow(1)}>
    <View className="mb-2 h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1A` }}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text numberOfLines={1} className="text-xl font-bold text-slate-900">
      {value}
    </Text>
    <Text className="text-xs font-medium text-slate-500">{label}</Text>
  </View>
);

type Props = { trip: Trip; onGoTo: (tab: "Itinerary" | "Places" | "Budget") => void; onAiPlan: () => void; aiPlanning: boolean };

const OverviewTab = ({ trip, onGoTo, onAiPlan, aiPlanning }: Props) => {
  const [notes, setNotes] = useState(trip.notes ?? "");
  const [newItem, setNewItem] = useState("");

  useEffect(() => setNotes(trip.notes ?? ""), [trip.notes]);

  // Older trips have no saved coordinates; look them up from the name.
  const { data: geocoded } = useQuery({
    queryKey: ["geocode", trip.tripName],
    queryFn: () => geocode(trip.tripName),
    enabled: !trip.location?.lat && !trip.location?.lng,
    staleTime: Infinity,
  });
  const location = trip.location?.lat || trip.location?.lng ? trip.location : geocoded;

  const saveNotes = useTripMutation(trip._id, (text: string) => api.updateTrip(trip._id, { notes: text }), { success: "Notes saved" });
  const addItems = useTripMutation(trip._id, (items: string[]) => api.addChecklist(trip._id, items));
  const toggle = useTripMutation(trip._id, ({ id, done }: { id: string; done: boolean }) => api.toggleChecklist(trip._id, id, done), {
    optimistic: (t, { id, done }) => ({ ...t, checklist: t.checklist.map((c) => (c._id === id ? { ...c, done } : c)) }),
  });
  const remove = useTripMutation(trip._id, (id: string) => api.removeChecklist(trip._id, id), {
    optimistic: (t, id) => ({ ...t, checklist: t.checklist.filter((c) => c._id !== id) }),
  });

  const activities = trip.itinerary.reduce((n, d) => n + d.activities.length, 0);
  const spent = trip.expenses.reduce((s, e) => s + e.price, 0);
  const checklist = trip.checklist ?? [];
  const packed = checklist.filter((c) => c.done).length;

  const addItem = () => {
    const text = newItem.trim();
    if (!text) return;
    setNewItem("");
    addItems.mutate([text]);
  };

  return (
    <View className="px-5 pt-4">
      <View className="flex-row flex-wrap justify-between">
        <Stat icon="sunny" value={`${tripLength(trip)}`} label={tripLength(trip) === 1 ? "Day" : "Days"} color="#F59E0B" />
        <Stat icon="bookmark" value={`${trip.placesToVisit.length}`} label="Saved places" color="#2563EB" />
        <Stat icon="map" value={`${activities}`} label="Planned stops" color={colors.brand} />
        <Stat
          icon="wallet"
          value={formatMoney(spent, trip.currency)}
          label={trip.budget ? `of ${formatMoney(trip.budget, trip.currency)} budget` : "Spent so far"}
          color={colors.success}
        />
      </View>

      {activities === 0 && (
        <View className="mb-5 mt-1 overflow-hidden rounded-3xl bg-violet-600 p-5" style={shadow(2)}>
          <View className="mb-1 flex-row items-center">
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text className="ml-2 text-lg font-bold text-white">Let AI plan your days</Text>
          </View>
          <Text className="mb-4 text-sm leading-5 text-violet-100">
            Get a day-by-day itinerary for {trip.tripName.split(",")[0]} with real places grouped by area. You can edit everything after.
          </Text>
          <Button title={aiPlanning ? "Planning your trip…" : "Create my itinerary"} variant="outline" loading={aiPlanning} onPress={onAiPlan} className="self-start" />
        </View>
      )}

      <WeatherStrip location={location} startDate={trip.startDate} endDate={trip.endDate} />

      <View className="mb-5 rounded-3xl bg-white p-4" style={shadow(1)}>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-[15px] font-bold text-slate-900">Notes</Text>
          {notes !== (trip.notes ?? "") && (
            <Pressable hitSlop={8} onPress={() => saveNotes.mutate(notes)}>
              <Text className="text-sm font-bold text-brand">{saveNotes.isPending ? "Saving…" : "Save"}</Text>
            </Pressable>
          )}
        </View>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          onBlur={() => notes !== (trip.notes ?? "") && saveNotes.mutate(notes)}
          multiline
          placeholder="Bookings, how to get around, hidden gems…"
          placeholderTextColor={colors.subtle}
          style={{ minHeight: 70, fontSize: 15, lineHeight: 21, color: colors.text, textAlignVertical: "top" }}
        />
      </View>

      <View className="mb-5 rounded-3xl bg-white p-4" style={shadow(1)}>
        <View className="mb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-[15px] font-bold text-slate-900">Packing list</Text>
            <Text className="text-xs text-slate-500">{checklist.length ? `${packed} of ${checklist.length} packed` : "Never forget the essentials"}</Text>
          </View>
          {checklist.length === 0 && (
            <Button title="Add essentials" size="sm" variant="secondary" loading={addItems.isPending} onPress={() => addItems.mutate(ESSENTIALS)} />
          )}
        </View>
        {checklist.length > 0 && (
          <View className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <View className="h-full rounded-full bg-emerald-500" style={{ width: `${(packed / checklist.length) * 100}%` }} />
          </View>
        )}
        {checklist.map((item) => (
          <Pressable
            key={item._id}
            onPress={() => toggle.mutate({ id: item._id, done: !item.done })}
            onLongPress={() =>
              Alert.alert("Remove item?", item.text, [
                { text: "Cancel", style: "cancel" },
                { text: "Remove", style: "destructive", onPress: () => remove.mutate(item._id) },
              ])
            }
            className="flex-row items-center py-2 active:opacity-60"
          >
            <Ionicons name={item.done ? "checkmark-circle" : "ellipse-outline"} size={22} color={item.done ? colors.success : "#CBD5E1"} />
            <Text className={`ml-2.5 flex-1 text-[15px] ${item.done ? "text-slate-400 line-through" : "text-slate-800"}`}>{item.text}</Text>
          </Pressable>
        ))}
        <View className="mt-2 h-11 flex-row items-center rounded-2xl bg-slate-50 px-3">
          <Ionicons name="add" size={18} color={colors.muted} />
          <TextInput
            value={newItem}
            onChangeText={setNewItem}
            onSubmitEditing={addItem}
            placeholder="Add an item"
            placeholderTextColor={colors.subtle}
            returnKeyType="done"
            blurOnSubmit={false}
            style={{ flex: 1, marginLeft: 6, fontSize: 15, color: colors.ink, paddingVertical: 0 }}
          />
          {!!newItem.trim() && (
            <Pressable hitSlop={8} onPress={addItem}>
              <Text className="text-sm font-bold text-brand">Add</Text>
            </Pressable>
          )}
        </View>
        {checklist.length > 0 && <Text className="mt-2 text-[11px] text-slate-400">Tip: long-press an item to remove it</Text>}
      </View>

      <View className="flex-row gap-3">
        <Button title="Itinerary" icon="list" variant="outline" className="flex-1" onPress={() => onGoTo("Itinerary")} />
        <Button title="Budget" icon="wallet-outline" variant="outline" className="flex-1" onPress={() => onGoTo("Budget")} />
      </View>
    </View>
  );
};

export default OverviewTab;

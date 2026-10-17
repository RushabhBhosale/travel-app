import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import PlaceCard from "../../components/PlaceCard";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";
import EmptyState from "../../components/ui/EmptyState";
import AppImage from "../../components/ui/AppImage";
import { toast } from "../../components/ui/Toast";
import DayPickerSheet from "./DayPickerSheet";
import { api, getErrorMessage } from "../../lib/api";
import { useTripMutation } from "../../lib/queries";
import { colors, shadow } from "../../theme";
import type { Place, PlaceInput, Trip } from "../../lib/types";

const INTERESTS = ["Must-sees", "Food", "Nature", "Culture", "Nightlife", "Hidden gems"];

const toInput = (p: Place): PlaceInput => ({ placeData: p });

const PlacesTab = ({ trip, onAddPlace }: { trip: Trip; onAddPlace: () => void }) => {
  const [interest, setInterest] = useState(INTERESTS[0]);
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [dayFor, setDayFor] = useState<Place | null>(null);
  const [savingName, setSavingName] = useState<string | null>(null);

  const removePlace = useTripMutation(trip._id, (id: string) => api.removePlace(trip._id, id), {
    optimistic: (t, id) => ({ ...t, placesToVisit: t.placesToVisit.filter((p) => p._id !== id) }),
  });
  const savePlace = useTripMutation(trip._id, (p: Place) => api.addPlace(trip._id, toInput(p)), { success: "Saved to your places" });
  const addToDay = useTripMutation(trip._id, ({ p, date }: { p: Place; date: string }) => api.addActivity(trip._id, date, toInput(p)), {
    success: "Added to your itinerary",
  });

  const suggest = useMutation({
    mutationFn: () =>
      api.suggestions(
        trip.tripName,
        [...trip.placesToVisit.map((p) => p.name), ...suggestions.map((p) => p.name)],
        interest === "Must-sees" ? undefined : interest.toLowerCase()
      ),
    onSuccess: (places) => setSuggestions(places),
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't get suggestions")),
  });

  const saved = new Set(trip.placesToVisit.map((p) => p.name.toLowerCase()));

  return (
    <View className="px-5 pt-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-bold text-slate-900">Saved places</Text>
          <Text className="text-xs text-slate-500">Your wishlist. Add them to a day when you're ready.</Text>
        </View>
        <Button title="Add" icon="add" size="sm" onPress={onAddPlace} />
      </View>

      {trip.placesToVisit.length === 0 ? (
        <View className="mb-6 rounded-3xl bg-white" style={shadow(1)}>
          <EmptyState compact icon="bookmark-outline" title="No saved places yet" subtitle="Search for spots or get AI ideas below." />
        </View>
      ) : (
        <View className="mb-4">
          {trip.placesToVisit.map((p, i) => (
            <PlaceCard
              key={p._id ?? `${p.name}-${i}`}
              place={p}
              onRemove={p._id ? () => removePlace.mutate(p._id!) : undefined}
              extraAction={{ icon: "calendar-outline", label: "Add to day", color: colors.brand, onPress: () => setDayFor(p) }}
            />
          ))}
        </View>
      )}

      <View className="mb-4 mt-2 rounded-3xl bg-white p-4" style={shadow(1)}>
        <View className="mb-1 flex-row items-center">
          <Ionicons name="sparkles" size={17} color={colors.ai} />
          <Text className="ml-2 text-[15px] font-bold text-slate-900">Discover with AI</Text>
        </View>
        <Text className="mb-3 text-xs text-slate-500">Personalised ideas for {trip.tripName.split(",")[0]}</Text>
        <View className="mb-3 flex-row flex-wrap">
          {INTERESTS.map((i) => (
            <Chip key={i} label={i} selected={interest === i} color={colors.ai} onPress={() => setInterest(i)} className="mb-2 mr-2" />
          ))}
        </View>
        <Button
          title={suggest.isPending ? "Finding places…" : suggestions.length ? "Show different ideas" : "Get suggestions"}
          variant="ai"
          icon="sparkles"
          loading={suggest.isPending}
          onPress={() => suggest.mutate()}
        />
      </View>

      {suggest.isPending && suggestions.length === 0 && (
        <View className="items-center py-6">
          <ActivityIndicator color={colors.ai} />
          <Text className="mt-2 text-xs text-slate-500">Looking up real places and photos…</Text>
        </View>
      )}

      {suggestions.map((p) => {
        const isSaved = saved.has(p.name.toLowerCase());
        return (
          <View key={p.name} className="mb-3 flex-row items-center rounded-3xl bg-white p-2.5" style={shadow(1)}>
            <AppImage source={p.photos?.[0]} style={{ width: 64, height: 64, borderRadius: 16 }} fallbackIcon="location" />
            <View className="mx-3 flex-1">
              <Text numberOfLines={1} className="text-[15px] font-bold text-slate-900">
                {p.name}
              </Text>
              <Text numberOfLines={2} className="text-xs leading-4 text-slate-500">
                {p.briefDescription || p.formatted_address}
              </Text>
            </View>
            <View className="items-center">
              <Pressable
                disabled={isSaved || savingName === p.name}
                onPress={async () => {
                  setSavingName(p.name);
                  await savePlace.mutateAsync(p).catch(() => {});
                  setSavingName(null);
                }}
                className={`mb-1.5 h-9 w-9 items-center justify-center rounded-full ${isSaved ? "bg-emerald-50" : "bg-brand-50"}`}
              >
                {savingName === p.name ? (
                  <ActivityIndicator size="small" color={colors.brand} />
                ) : (
                  <Ionicons name={isSaved ? "checkmark" : "bookmark-outline"} size={17} color={isSaved ? colors.success : colors.brand} />
                )}
              </Pressable>
              <Pressable onPress={() => setDayFor(p)} className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                <Ionicons name="calendar-outline" size={16} color={colors.text} />
              </Pressable>
            </View>
          </View>
        );
      })}

      <DayPickerSheet
        trip={trip}
        visible={!!dayFor}
        title={dayFor ? `Add ${dayFor.name}` : ""}
        onClose={() => setDayFor(null)}
        onPick={(date) => {
          if (dayFor) addToDay.mutate({ p: dayFor, date });
          setDayFor(null);
        }}
      />
    </View>
  );
};

export default PlacesTab;

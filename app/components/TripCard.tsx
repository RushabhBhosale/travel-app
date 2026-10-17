import React, { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppImage from "./ui/AppImage";
import { shadow } from "../theme";
import { formatDateRange, tripLength, tripStatus } from "../lib/format";
import { tripCover, tripCoverFallback } from "../lib/images";
import type { Trip } from "../lib/types";

type Props = { trip: Trip; onPress: () => void; onLongPress?: () => void; variant?: "hero" | "row" };

const PHASE_STYLE = {
  upcoming: "bg-white/95",
  ongoing: "bg-emerald-500",
  past: "bg-slate-900/70",
};

const TripCard = ({ trip, onPress, onLongPress, variant = "row" }: Props) => {
  const status = tripStatus(trip);
  const activities = trip.itinerary?.reduce((n, d) => n + d.activities.length, 0) ?? 0;
  const places = trip.placesToVisit?.length ?? 0;

  if (variant === "hero") {
    return (
      <Pressable onPress={onPress} onLongPress={onLongPress} className="active:opacity-90" style={shadow(2)}>
        <AppImage source={tripCover(trip)} fallback={tripCoverFallback(trip)} scrim style={{ height: 220, borderRadius: 28 }} priority="high">
          <View className="absolute left-4 top-4">
            <View className={`rounded-full px-3 py-1 ${PHASE_STYLE[status.phase]}`}>
              <Text className={`text-xs font-bold ${status.phase === "upcoming" ? "text-brand-600" : "text-white"}`}>{status.label}</Text>
            </View>
          </View>
          <View className="absolute bottom-0 left-0 right-0 p-5">
            <Text numberOfLines={1} className="text-2xl font-bold tracking-tight text-white">
              {trip.tripName}
            </Text>
            <View className="mt-1.5 flex-row items-center">
              <Ionicons name="calendar-outline" size={13} color="#E2E8F0" />
              <Text className="ml-1.5 text-[13px] font-medium text-slate-200">
                {formatDateRange(trip.startDate, trip.endDate)} · {tripLength(trip)} {tripLength(trip) === 1 ? "day" : "days"}
              </Text>
            </View>
          </View>
        </AppImage>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} className="mb-3 flex-row items-center rounded-3xl bg-white p-2.5 active:opacity-80" style={shadow(1)}>
      <AppImage source={tripCover(trip)} fallback={tripCoverFallback(trip)} style={{ width: 76, height: 76, borderRadius: 20 }} fallbackIcon="airplane" />
      <View className="ml-3.5 flex-1">
        <Text numberOfLines={1} className="text-base font-bold text-slate-900">
          {trip.tripName}
        </Text>
        <Text className="mt-0.5 text-[13px] text-slate-500">{formatDateRange(trip.startDate, trip.endDate)}</Text>
        <View className="mt-1.5 flex-row items-center">
          <View
            className={`mr-2 rounded-full px-2 py-0.5 ${
              status.phase === "ongoing" ? "bg-emerald-50" : status.phase === "past" ? "bg-slate-100" : "bg-brand-50"
            }`}
          >
            <Text
              className={`text-[11px] font-bold ${
                status.phase === "ongoing" ? "text-emerald-700" : status.phase === "past" ? "text-slate-500" : "text-brand-600"
              }`}
            >
              {status.label}
            </Text>
          </View>
          <Text className="text-xs text-slate-400">
            {places + activities} {places + activities === 1 ? "place" : "places"}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" style={{ marginRight: 4 }} />
    </Pressable>
  );
};

export default memo(TripCard);

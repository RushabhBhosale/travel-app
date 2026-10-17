import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Calendar, DateData } from "react-native-calendars";
import { useUser } from "@clerk/clerk-expo";
import dayjs from "dayjs";
import AppImage from "../components/ui/AppImage";
import Button from "../components/ui/Button";
import Chip from "../components/ui/Chip";
import IconButton from "../components/ui/IconButton";
import Sheet from "../components/ui/Sheet";
import { toast } from "../components/ui/Toast";
import PlaceSearch from "../components/PlaceSearch";
import { DESTINATIONS, destinationById, matchDestination } from "../data/destinations";
import { api, getErrorMessage } from "../lib/api";
import { useSetTrip } from "../lib/queries";
import { locateSuggestion, PlaceSuggestion } from "../lib/places";
import { findPhoto } from "../lib/wiki";
import { CURRENCIES, formatDateRange } from "../lib/format";
import { useSettings } from "../lib/settings";
import { colors, shadow } from "../theme";
import type { ScreenProps } from "../navigation/types";

type Chosen = {
  name: string;
  subtitle?: string;
  destinationId?: string;
  location?: { lat: number; lng: number };
  suggestion?: PlaceSuggestion;
};

const QUICK_PICKS = ["goa", "coorg", "jaipur", "munnar", "leh", "dubai", "bali", "paris"].map((id) => destinationById(id)!);

const NewTripScreen = ({ navigation, route }: ScreenProps<"NewTrip">) => {
  const { user } = useUser();
  const setTrip = useSetTrip();
  const settings = useSettings();

  const initial = useMemo<Chosen | null>(() => {
    const d = destinationById(route.params?.destinationId);
    if (d) return { name: d.name, subtitle: d.region, destinationId: d.id, location: d.location };
    const p = route.params?.place;
    if (p) return { name: p.name, subtitle: p.subtitle, location: { lat: p.lat, lng: p.lng } };
    return null;
  }, [route.params]);

  const [destination, setDestination] = useState<Chosen | null>(initial);
  const [range, setRange] = useState<{ start?: string; end?: string }>({});
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState(settings.currency);
  const [searchOpen, setSearchOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const today = dayjs().format("YYYY-MM-DD");
  const curated = destination?.destinationId ? destinationById(destination.destinationId) : destination ? matchDestination(destination.name) : undefined;

  const marked = useMemo(() => {
    const marks: Record<string, any> = {};
    const { start, end } = range;
    if (!start) return marks;
    const last = dayjs(end ?? start);
    for (let d = dayjs(start); !d.isAfter(last, "day"); d = d.add(1, "day")) {
      const key = d.format("YYYY-MM-DD");
      marks[key] = {
        color: key === start || key === (end ?? start) ? colors.brand : colors.brandSoft,
        textColor: key === start || key === (end ?? start) ? "#fff" : colors.brandDark,
        startingDay: key === start,
        endingDay: key === (end ?? start),
      };
    }
    return marks;
  }, [range]);

  const onDayPress = (day: DateData) => {
    const d = day.dateString;
    setRange((r) => {
      if (!r.start || r.end) return { start: d };
      if (d < r.start) return { start: d };
      return { start: r.start, end: d };
    });
  };

  const nights = range.start ? dayjs(range.end ?? range.start).diff(dayjs(range.start), "day") : 0;

  const pick = (c: Chosen) => {
    setDestination(c);
    setSearchOpen(false);
    // Wait for the search sheet to finish closing; iOS can't stack two modals mid-transition.
    if (!range.start) setTimeout(() => setCalendarOpen(true), 550);
  };

  const create = async () => {
    if (!destination) return setSearchOpen(true);
    if (!range.start) return setCalendarOpen(true);
    setCreating(true);
    try {
      const fullName = [destination.name, destination.subtitle].filter(Boolean).join(", ");
      const [location, photo] = await Promise.all([
        destination.location ?? (destination.suggestion ? locateSuggestion(destination.suggestion) : undefined),
        curated ? Promise.resolve(`asset:${curated.id}`) : findPhoto(destination.name),
      ]);
      const trip = await api.createTrip({
        tripName: curated ? `${curated.name}, ${curated.region.split(", ").pop()}` : fullName,
        startDate: range.start,
        endDate: range.end ?? range.start,
        background: photo ?? "",
        location,
        budget: Number(budget.replace(/[^0-9.]/g, "")) || 0,
        currency,
        userData: { email: user?.primaryEmailAddress?.emailAddress, name: user?.fullName ?? undefined },
      });
      setTrip(trip);
      toast.success("Trip created. Let's plan it!");
      navigation.replace("Trip", { tripId: trip._id });
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't create the trip"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
          <IconButton name="close" onPress={() => navigation.goBack()} accessibilityLabel="Close" />
          <Text className="text-base font-bold text-slate-900">New trip</Text>
          <View className="w-10" />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Text className="text-[28px] font-bold leading-9 tracking-tight text-slate-900">Where are you{"\n"}heading next?</Text>
          <Text className="mb-6 mt-1.5 text-[15px] text-slate-500">Pick a destination and dates. You can change everything later.</Text>

          <Pressable onPress={() => setSearchOpen(true)} className="mb-3 rounded-3xl bg-white active:opacity-80" style={shadow(1)}>
            {destination && curated ? (
              <AppImage source={curated.image} scrim style={{ height: 130, borderRadius: 24 }}>
                <View className="absolute bottom-0 left-0 right-0 flex-row items-end justify-between p-4">
                  <View>
                    <Text className="text-xs font-semibold uppercase tracking-wider text-slate-300">Destination</Text>
                    <Text className="text-xl font-bold text-white">{destination.name}</Text>
                    <Text className="text-[13px] text-slate-200">{destination.subtitle}</Text>
                  </View>
                  <Text className="text-sm font-semibold text-white">Change</Text>
                </View>
              </AppImage>
            ) : (
              <View className="flex-row items-center p-4">
                <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-brand-50">
                  <Ionicons name="location" size={20} color={colors.brand} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Destination</Text>
                  <Text numberOfLines={1} className={`text-base font-semibold ${destination ? "text-slate-900" : "text-slate-400"}`}>
                    {destination ? destination.name : "Search any city or place"}
                  </Text>
                  {!!destination?.subtitle && (
                    <Text numberOfLines={1} className="text-[13px] text-slate-500">
                      {destination.subtitle}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
              </View>
            )}
          </Pressable>

          <Pressable onPress={() => setCalendarOpen(true)} className="mb-3 flex-row items-center rounded-3xl bg-white p-4 active:opacity-80" style={shadow(1)}>
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
              <Ionicons name="calendar" size={20} color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dates</Text>
              <Text className={`text-base font-semibold ${range.start ? "text-slate-900" : "text-slate-400"}`}>
                {range.start ? formatDateRange(range.start, range.end ?? range.start) : "Add dates"}
              </Text>
              {!!range.start && (
                <Text className="text-[13px] text-slate-500">
                  {nights + 1} {nights === 0 ? "day" : "days"}
                  {nights > 0 ? ` · ${nights} ${nights === 1 ? "night" : "nights"}` : ""}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
          </Pressable>

          <View className="mb-6 rounded-3xl bg-white p-4" style={shadow(1)}>
            <View className="flex-row items-center">
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                <Ionicons name="wallet" size={20} color={colors.success} />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Budget (optional)</Text>
                <TextInput
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 25000"
                  placeholderTextColor={colors.subtle}
                  style={{ fontSize: 16, fontWeight: "600", color: colors.ink, paddingVertical: 2 }}
                />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" keyboardShouldPersistTaps="handled">
              {CURRENCIES.map((c) => (
                <Chip key={c.code} label={c.code} selected={currency === c.code} onPress={() => setCurrency(c.code)} className="mr-2" color={colors.success} />
              ))}
            </ScrollView>
          </View>

          <Button title="Start planning" icon="arrow-forward" size="lg" loading={creating} onPress={create} />
          <Text className="mt-3 text-center text-xs text-slate-400">AI can fill in your itinerary on the next screen</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Sheet visible={searchOpen} onClose={() => setSearchOpen(false)} title="Choose a destination" height={0.85}>
        <PlaceSearch
          autoFocus
          placeholder="City, region or landmark"
          onSelect={(s) => pick({ name: s.title, subtitle: s.subtitle, location: s.location, suggestion: s })}
          emptyContent={
            <View className="px-5 pt-5">
              <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Popular picks</Text>
              <View className="flex-row flex-wrap">
                {QUICK_PICKS.map((d) => (
                  <Pressable
                    key={d.id}
                    onPress={() => pick({ name: d.name, subtitle: d.region, destinationId: d.id, location: d.location })}
                    className="mb-3 mr-3 flex-row items-center rounded-full bg-slate-100 py-1.5 pl-1.5 pr-3.5 active:opacity-70"
                  >
                    <AppImage source={d.image} style={{ width: 30, height: 30, borderRadius: 15 }} />
                    <Text className="ml-2 text-sm font-semibold text-slate-800">{d.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">All guides</Text>
              <Text className="mt-1 text-[13px] text-slate-500">{DESTINATIONS.map((d) => d.name).join(" · ")}</Text>
            </View>
          }
        />
      </Sheet>

      <Sheet
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        title="When are you going?"
        subtitle={
          range.start
            ? range.end
              ? `${formatDateRange(range.start, range.end)} · ${nights + 1} days`
              : "Tap an end date, or Done for a day trip"
            : "Tap your start date"
        }
        footer={<Button title={range.start ? "Done" : "Pick a start date"} disabled={!range.start} onPress={() => setCalendarOpen(false)} />}
      >
        <Calendar
          markingType="period"
          markedDates={marked}
          onDayPress={onDayPress}
          minDate={today}
          current={range.start ?? today}
          enableSwipeMonths
          theme={{
            todayTextColor: colors.brand,
            arrowColor: colors.brand,
            textDayFontWeight: "500",
            textMonthFontWeight: "700",
            textDayHeaderFontWeight: "600",
            textSectionTitleColor: colors.subtle,
            monthTextColor: colors.ink,
          }}
          style={{ marginHorizontal: 12 }}
        />
      </Sheet>
    </SafeAreaView>
  );
};

export default NewTripScreen;

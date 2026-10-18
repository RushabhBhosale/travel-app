import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActionSheetIOS, Alert, Animated, Platform, Pressable, RefreshControl, Share, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Calendar, DateData } from "react-native-calendars";
import dayjs from "dayjs";
import * as Haptics from "expo-haptics";
import AppImage from "../components/ui/AppImage";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import IconButton from "../components/ui/IconButton";
import Sheet from "../components/ui/Sheet";
import Skeleton from "../components/ui/Skeleton";
import TextField from "../components/ui/TextField";
import { toast } from "../components/ui/Toast";
import OverviewTab from "./trip/OverviewTab";
import ItineraryTab from "./trip/ItineraryTab";
import PlacesTab from "./trip/PlacesTab";
import BudgetTab from "./trip/BudgetTab";
import AddPlaceSheet from "./trip/AddPlaceSheet";
import { api, getErrorMessage } from "../lib/api";
import { useDeleteTrip, useSetTrip, useTrip, useTripMutation } from "../lib/queries";
import { formatDateRange, tripLength, tripStatus, tripToText } from "../lib/format";
import { tripCover, tripCoverFallback } from "../lib/images";
import { colors, shadow } from "../theme";
import type { ScreenProps } from "../navigation/types";

const TABS = ["Overview", "Itinerary", "Places", "Budget"] as const;
type Tab = (typeof TABS)[number];

const TripScreen = ({ route, navigation }: ScreenProps<"Trip">) => {
  const { tripId } = route.params;
  const insets = useSafeAreaInsets();
  const { data: trip, isLoading, isError, refetch, isRefetching } = useTrip(tripId);
  const setTrip = useSetTrip();
  const deleteTrip = useDeleteTrip();

  const [tab, setTab] = useState<Tab>("Overview");
  const [addPlace, setAddPlace] = useState<{ open: boolean; date: string | null }>({ open: false, date: null });
  const [aiPlanning, setAiPlanning] = useState<string | boolean>(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRange, setEditRange] = useState<{ start?: string; end?: string }>({});

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);
  const titleOpacity = scrollY.interpolate({ inputRange: [150, 200], outputRange: [0, 1], extrapolate: "clamp" });

  const updateTrip = useTripMutation(tripId, (patch: { tripName: string; startDate?: string; endDate?: string }) => api.updateTrip(tripId, patch), {
    success: "Trip updated",
  });

  const runAiPlan = useCallback(
    async (date?: string) => {
      if (!trip || aiPlanning) return;
      setAiPlanning(date ?? true);
      try {
        const updated = await api.aiPlan(trip._id, date ? { date } : {});
        setTrip(updated);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        toast.success(date ? "Added AI suggestions for the day" : "Your itinerary is ready!");
        if (!date) setTab("Itinerary");
      } catch (err) {
        toast.error(getErrorMessage(err, "AI planning failed. Please try again."));
      } finally {
        setAiPlanning(false);
      }
    },
    [trip, aiPlanning, setTrip]
  );

  const share = () => trip && Share.share({ message: tripToText(trip), title: trip.tripName });

  const confirmDelete = () =>
    Alert.alert("Delete this trip?", "Your itinerary, places and expenses for this trip will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteTrip.mutateAsync(tripId).then(() => navigation.goBack(), () => {}),
      },
    ]);

  const openEdit = () => {
    if (!trip) return;
    setEditName(trip.tripName);
    setEditRange({ start: trip.startDate, end: trip.endDate });
    setEditOpen(true);
  };

  const openMenu = () => {
    const options = ["Edit trip details", "Share itinerary", "Delete trip", "Cancel"];
    const handle = (i: number) => [openEdit, share, confirmDelete][i]?.();
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options, destructiveButtonIndex: 2, cancelButtonIndex: 3 }, handle);
    } else {
      Alert.alert(trip?.tripName ?? "Trip", undefined, [
        { text: "Edit trip details", onPress: openEdit },
        { text: "Delete trip", style: "destructive", onPress: confirmDelete },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const editMarks = useMemo(() => {
    const marks: Record<string, any> = {};
    if (!editRange.start) return marks;
    const end = dayjs(editRange.end ?? editRange.start);
    for (let d = dayjs(editRange.start); !d.isAfter(end, "day"); d = d.add(1, "day")) {
      const k = d.format("YYYY-MM-DD");
      const edge = k === editRange.start || k === (editRange.end ?? editRange.start);
      marks[k] = { color: edge ? colors.brand : colors.brandSoft, textColor: edge ? "#fff" : colors.brandDark, startingDay: k === editRange.start, endingDay: k === (editRange.end ?? editRange.start) };
    }
    return marks;
  }, [editRange]);

  if (!trip) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="px-4 pt-1">
          <IconButton name="chevron-back" onPress={() => navigation.goBack()} />
        </View>
        {isLoading ? (
          <View className="px-5 pt-4">
            <Skeleton style={{ height: 200, borderRadius: 28, marginBottom: 20 }} />
            <Skeleton style={{ height: 40, marginBottom: 16 }} />
            <Skeleton style={{ height: 120, marginBottom: 12 }} />
            <Skeleton style={{ height: 120 }} />
          </View>
        ) : (
          <EmptyState
            icon={isError ? "cloud-offline-outline" : "airplane-outline"}
            title={isError ? "Couldn't load this trip" : "Trip not found"}
            subtitle={isError ? "Check your connection and try again." : "It may have been deleted."}
            action={{ title: "Try again", icon: "refresh", onPress: () => refetch() }}
          />
        )}
      </SafeAreaView>
    );
  }

  const status = tripStatus(trip);

  return (
    <View className="flex-1 bg-slate-50">
      <View className="z-10 flex-row items-center bg-slate-50 px-4 pb-2" style={{ paddingTop: insets.top + 4 }}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
        <Animated.Text numberOfLines={1} style={{ opacity: titleOpacity, flex: 1, marginHorizontal: 12, fontSize: 17, fontWeight: "700", color: colors.ink }}>
          {trip.tripName}
        </Animated.Text>
        <IconButton name="share-outline" onPress={share} accessibilityLabel="Share trip" className="mr-2" />
        <IconButton name="ellipsis-horizontal" onPress={openMenu} accessibilityLabel="Trip options" />
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
      >
        <View className="px-5 pb-3 pt-1">
          <AppImage source={tripCover(trip)} fallback={tripCoverFallback(trip)} scrim style={{ height: 200, borderRadius: 28 }} fallbackIcon="airplane" priority="high">
            <View className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1">
              <Text className={`text-xs font-bold ${status.phase === "ongoing" ? "text-emerald-600" : status.phase === "past" ? "text-slate-600" : "text-brand-600"}`}>
                {status.label}
              </Text>
            </View>
            <View className="absolute bottom-0 left-0 right-0 p-5">
              <Text numberOfLines={2} className="text-[26px] font-bold leading-8 tracking-tight text-white">
                {trip.tripName}
              </Text>
              <Text className="mt-1 text-[13px] font-medium text-slate-200">
                {formatDateRange(trip.startDate, trip.endDate)} · {tripLength(trip)} {tripLength(trip) === 1 ? "day" : "days"}
              </Text>
            </View>
          </AppImage>
        </View>

        <View className="bg-slate-50 px-5 pb-1 pt-2">
          <View className="flex-row rounded-2xl bg-slate-200/70 p-1">
            {TABS.map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setTab(t);
                }}
                className={`h-9 flex-1 items-center justify-center rounded-xl ${tab === t ? "bg-white" : ""}`}
                style={tab === t ? shadow(1) : undefined}
              >
                <Text className={`text-[13px] font-semibold ${tab === t ? "text-slate-900" : "text-slate-500"}`}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          {tab === "Overview" && <OverviewTab trip={trip} onGoTo={setTab} onAiPlan={() => runAiPlan()} aiPlanning={aiPlanning === true} />}
          {tab === "Itinerary" && (
            <ItineraryTab trip={trip} aiPlanning={aiPlanning} onAiPlan={runAiPlan} onAddPlace={(date) => setAddPlace({ open: true, date })} />
          )}
          {tab === "Places" && <PlacesTab trip={trip} onAddPlace={() => setAddPlace({ open: true, date: null })} />}
          {tab === "Budget" && <BudgetTab trip={trip} />}
        </View>
      </Animated.ScrollView>

      <View className="absolute right-5 items-end" style={{ bottom: insets.bottom + 20 }}>
        <Pressable
          onPress={() => navigation.navigate("AIChat", { tripId: trip._id })}
          className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-violet-600 active:opacity-80"
          style={shadow(3)}
          accessibilityLabel="Ask the AI assistant"
        >
          <Ionicons name="sparkles" size={22} color="#fff" />
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("Map", { tripId: trip._id })}
          className="h-14 flex-row items-center rounded-full bg-slate-900 px-5 active:opacity-80"
          style={shadow(3)}
        >
          <Ionicons name="map" size={20} color="#fff" />
          <Text className="ml-2 text-[15px] font-semibold text-white">Map</Text>
        </Pressable>
      </View>

      <AddPlaceSheet trip={trip} visible={addPlace.open} initialDate={addPlace.date} onClose={() => setAddPlace((s) => ({ ...s, open: false }))} />

      <Sheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit trip"
        footer={
          <Button
            title="Save changes"
            loading={updateTrip.isPending}
            disabled={!editName.trim() || !editRange.start}
            onPress={async () => {
              await updateTrip
                .mutateAsync({ tripName: editName.trim(), startDate: editRange.start, endDate: editRange.end ?? editRange.start })
                .then(() => setEditOpen(false))
                .catch(() => {});
            }}
          />
        }
      >
        <View className="px-5">
          <TextField label="Trip name" icon="create-outline" value={editName} onChangeText={setEditName} containerClassName="mb-3" />
          <Text className="mb-1 text-[13px] font-semibold text-slate-700">
            Dates · {editRange.start ? formatDateRange(editRange.start, editRange.end ?? editRange.start) : "pick a start date"}
          </Text>
        </View>
        <Calendar
          markingType="period"
          markedDates={editMarks}
          current={editRange.start}
          onDayPress={(d: DateData) =>
            setEditRange((r) => (!r.start || r.end || d.dateString < r.start ? { start: d.dateString } : { start: r.start, end: d.dateString }))
          }
          theme={{ todayTextColor: colors.brand, arrowColor: colors.brand, textMonthFontWeight: "700", monthTextColor: colors.ink }}
          style={{ marginHorizontal: 12 }}
        />
        <Text className="px-5 text-xs text-slate-400">Shortening a trip hides itinerary days outside the new dates.</Text>
      </Sheet>
    </View>
  );
};

export default TripScreen;

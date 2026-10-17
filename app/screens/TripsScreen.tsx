import React, { useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Button from "../components/ui/Button";
import Chip from "../components/ui/Chip";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import TripCard from "../components/TripCard";
import { getErrorMessage } from "../lib/api";
import { useDeleteTrip, useTrips } from "../lib/queries";
import { tripStatus } from "../lib/format";
import { colors } from "../theme";
import type { Trip } from "../lib/types";
import type { RootNav } from "../navigation/types";

type Filter = "upcoming" | "past";

const TripsScreen = () => {
  const navigation = useNavigation<RootNav>();
  const { data: trips, isLoading, isError, error, refetch, isRefetching } = useTrips();
  const deleteTrip = useDeleteTrip();
  const [filter, setFilter] = useState<Filter>("upcoming");

  const { upcoming, past } = useMemo(() => {
    const up: Trip[] = [];
    const done: Trip[] = [];
    (trips ?? []).forEach((t) => (tripStatus(t).phase === "past" ? done : up).push(t));
    up.sort((a, b) => a.startDate.localeCompare(b.startDate));
    done.sort((a, b) => b.startDate.localeCompare(a.startDate));
    return { upcoming: up, past: done };
  }, [trips]);

  const data = filter === "upcoming" ? upcoming : past;

  const onLongPress = (trip: Trip) =>
    Alert.alert(trip.tripName, undefined, [
      { text: "Open", onPress: () => navigation.navigate("Trip", { tripId: trip._id }) },
      {
        text: "Delete trip",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete this trip?", "This can't be undone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteTrip.mutate(trip._id) },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50">
      <View className="flex-row items-end justify-between px-5 pb-3 pt-2">
        <View>
          <Text className="text-[28px] font-bold tracking-tight text-slate-900">My trips</Text>
          <Text className="text-sm text-slate-500">
            {trips ? `${upcoming.length} upcoming · ${past.length} completed` : "Your adventures in one place"}
          </Text>
        </View>
        <Button title="New" icon="add" size="sm" onPress={() => navigation.navigate("NewTrip")} />
      </View>
      <View className="flex-row px-5 pb-3">
        <Chip label={`Upcoming${trips ? ` (${upcoming.length})` : ""}`} selected={filter === "upcoming"} onPress={() => setFilter("upcoming")} className="mr-2" />
        <Chip label={`Past${trips ? ` (${past.length})` : ""}`} selected={filter === "past"} onPress={() => setFilter("past")} />
      </View>

      {isLoading && !trips ? (
        <View className="px-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 96, borderRadius: 24, marginBottom: 12 }} />
          ))}
        </View>
      ) : isError && !trips ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load your trips"
          subtitle={`${getErrorMessage(error)} The server may be waking up; this can take up to a minute.`}
          action={{ title: "Try again", icon: "refresh", onPress: () => refetch() }}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(t) => t._id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
          renderItem={({ item }) => (
            <TripCard trip={item} onPress={() => navigation.navigate("Trip", { tripId: item._id })} onLongPress={() => onLongPress(item)} />
          )}
          ListFooterComponent={data.length > 0 ? <Text className="mt-2 text-center text-[11px] text-slate-400">Long-press a trip for more options</Text> : null}
          ListEmptyComponent={
            filter === "upcoming" ? (
              <EmptyState
                icon="airplane-outline"
                title="No upcoming trips"
                subtitle="Create a trip and let AI help you plan every day."
                action={{ title: "Plan a trip", icon: "add", onPress: () => navigation.navigate("NewTrip") }}
              />
            ) : (
              <EmptyState icon="time-outline" title="No past trips yet" subtitle="Trips move here after their end date." />
            )
          }
        />
      )}
    </SafeAreaView>
  );
};

export default TripsScreen;

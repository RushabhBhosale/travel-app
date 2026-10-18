import React, { useMemo } from "react";
import dayjs from "dayjs";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useUser } from "@clerk/clerk-expo";
import AppImage from "../components/ui/AppImage";
import Button from "../components/ui/Button";
import SectionHeader from "../components/ui/SectionHeader";
import TripCard from "../components/TripCard";
import DestinationCard from "../components/DestinationCard";
import { CATEGORIES, destinationById, inSeason } from "../data/destinations";
import { useTrips } from "../lib/queries";
import { greeting, tripStatus } from "../lib/format";
import { colors, shadow } from "../theme";
import type { RootNav } from "../navigation/types";

const WORLD = ["santorini", "kyoto", "bali", "interlaken", "paris", "singapore"].map((id) => destinationById(id)!);

// Varied picks for the seasonal row, most interesting first; filtered to what's in season.
const SEASONAL_ORDER = [
  "udaipur", "rishikesh", "darjeeling", "varanasi", "havelock", "leh", "jaipur", "munnar",
  "gokarna", "alleppey", "pondicherry", "goa", "dubai", "tokyo", "london", "nyc", "edinburgh",
  "hampi", "ooty", "chikmagalur", "mysore",
];

const QuickAction = ({ icon, label, color, bg, onPress }: { icon: any; label: string; color: string; bg: string; onPress: () => void }) => (
  <Pressable onPress={onPress} className="flex-1 items-center rounded-3xl bg-white py-4 active:opacity-70" style={shadow(1)}>
    <View className="mb-2 h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: bg }}>
      <Ionicons name={icon} size={21} color={color} />
    </View>
    <Text className="text-[13px] font-semibold text-slate-800">{label}</Text>
  </Pressable>
);

const HomeScreen = () => {
  const navigation = useNavigation<RootNav>();
  const { user } = useUser();
  const { data: trips, refetch, isRefetching } = useTrips();

  const nextTrip = useMemo(
    () => trips?.filter((t) => tripStatus(t).phase !== "past").sort((a, b) => a.startDate.localeCompare(b.startDate))[0],
    [trips]
  );

  const month = dayjs().month();
  const seasonal = useMemo(
    () =>
      SEASONAL_ORDER.map((id) => destinationById(id)!)
        .filter((d) => inSeason(d, month))
        .slice(0, 8),
    [month]
  );

  const openDestination = (id: string) => navigation.navigate("Destination", { id });

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
      >
        <View className="flex-row items-center px-5 pb-4 pt-2">
          <View className="flex-1">
            <Text className="text-sm font-medium text-slate-500">{greeting()},</Text>
            <Text className="text-2xl font-bold tracking-tight text-slate-900">{user?.firstName || "traveller"} 👋</Text>
          </View>
          <Pressable onPress={() => navigation.navigate("Tabs", { screen: "Profile" })}>
            <AppImage source={user?.imageUrl} fallbackIcon="person" style={{ width: 44, height: 44, borderRadius: 22 }} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigation.navigate("Tabs", { screen: "Explore" })}
          className="mx-5 mb-5 h-12 flex-row items-center rounded-2xl bg-white px-4 active:opacity-80"
          style={shadow(1)}
        >
          <Ionicons name="search" size={18} color={colors.muted} />
          <Text className="ml-2.5 text-[15px] text-slate-400">Where do you want to go?</Text>
        </Pressable>

        <View className="px-5">
          {nextTrip ? (
            <>
              <SectionHeader title={tripStatus(nextTrip).phase === "ongoing" ? "Happening now" : "Your next trip"} action="All trips" onAction={() => navigation.navigate("Tabs", { screen: "Trips" })} />
              <TripCard variant="hero" trip={nextTrip} onPress={() => navigation.navigate("Trip", { tripId: nextTrip._id })} />
            </>
          ) : (
            <AppImage source={destinationById("coorg")?.image} scrim style={{ height: 230, borderRadius: 28 }} priority="high">
              <View className="absolute bottom-0 left-0 right-0 p-5">
                <Text className="text-[26px] font-bold leading-8 tracking-tight text-white">Plan your next{"\n"}adventure</Text>
                <Text className="mb-4 mt-1 text-sm text-slate-200">Build day-by-day plans with AI, maps and budgets.</Text>
                <Button title="Create a trip" icon="add" onPress={() => navigation.navigate("NewTrip")} className="self-start" />
              </View>
            </AppImage>
          )}
        </View>

        <View className="mt-5 flex-row gap-3 px-5">
          <QuickAction icon="add-circle" label="New trip" color={colors.brand} bg={colors.brandSoft} onPress={() => navigation.navigate("NewTrip")} />
          <QuickAction
            icon="sparkles"
            label="Ask AI"
            color={colors.ai}
            bg={colors.aiSoft}
            onPress={() => navigation.navigate("AIChat", nextTrip ? { tripId: nextTrip._id } : undefined)}
          />
          <QuickAction icon="compass" label="Explore" color="#0891B2" bg="#ECFEFF" onPress={() => navigation.navigate("Tabs", { screen: "Explore" })} />
        </View>

        <View className="mt-7">
          <SectionHeader
            title="In season now"
            subtitle="Great weather to visit right now"
            className="px-5"
            action="See all"
            onAction={() => navigation.navigate("Tabs", { screen: "Explore" })}
          />
          <FlatList
            horizontal
            data={seasonal}
            keyExtractor={(d) => d.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => <DestinationCard destination={item} onPress={() => openDestination(item.id)} />}
          />
        </View>

        <View className="mt-7">
          <SectionHeader title="Browse by vibe" className="px-5" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.label}
                onPress={() => navigation.navigate("Tabs", { screen: "Explore", params: { category: c.label } })}
                className="mr-2.5 flex-row items-center rounded-2xl bg-white px-4 py-3 active:opacity-70"
                style={shadow(1)}
              >
                <Ionicons name={c.icon as any} size={17} color={colors.brand} />
                <Text className="ml-2 text-sm font-semibold text-slate-800">{c.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View className="mt-7">
          <SectionHeader title="Dream destinations" subtitle="Popular around the world" className="px-5" action="See all" onAction={() => navigation.navigate("Tabs", { screen: "Explore" })} />
          <FlatList
            horizontal
            data={WORLD}
            keyExtractor={(d) => d.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => <DestinationCard size="wide" destination={item} onPress={() => openDestination(item.id)} />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

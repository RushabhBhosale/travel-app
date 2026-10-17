import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import Chip from "../components/ui/Chip";
import EmptyState from "../components/ui/EmptyState";
import DestinationCard from "../components/DestinationCard";
import { CATEGORIES, Category, DESTINATIONS } from "../data/destinations";
import { PlaceSuggestion, searchPlaces } from "../lib/places";
import { colors, shadow } from "../theme";
import type { RootNav, TabParams } from "../navigation/types";

const ExploreScreen = () => {
  const navigation = useNavigation<RootNav>();
  const route = useRoute<RouteProp<TabParams, "Explore">>();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | null>(route.params?.category ?? null);
  const [remote, setRemote] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (route.params?.category) setCategory(route.params.category);
  }, [route.params?.category]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DESTINATIONS.filter(
      (d) =>
        (!category || d.categories.includes(category)) &&
        (!q || `${d.name} ${d.region} ${d.tagline} ${d.categories.join(" ")} ${d.attractions.join(" ")}`.toLowerCase().includes(q))
    );
  }, [query, category]);

  // Anything not in the curated guide can still be searched worldwide.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setRemote([]);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const t = setTimeout(() => {
      searchPlaces(q, controller.signal)
        .then((r) => setRemote(r.slice(0, 4)))
        .catch(() => {})
        .finally(() => !controller.signal.aborted && setSearching(false));
    }, 350);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  const openRemote = (s: PlaceSuggestion) => {
    if (!s.location) return navigation.navigate("NewTrip");
    navigation.navigate("Destination", { place: { name: s.title, subtitle: s.subtitle, lat: s.location.lat, lng: s.location.lng } });
  };

  const header = (
    <View>
      <View className="px-5 pb-1 pt-2">
        <Text className="text-[28px] font-bold tracking-tight text-slate-900">Explore</Text>
        <Text className="mt-0.5 text-sm text-slate-500">Guides, weather and ideas for your next trip</Text>
      </View>

      <View className="mx-5 mt-4 h-12 flex-row items-center rounded-2xl bg-white px-4" style={shadow(1)}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search a city, country or landmark"
          placeholderTextColor={colors.subtle}
          autoCorrect={false}
          returnKeyType="search"
          style={{ flex: 1, marginLeft: 10, fontSize: 15, color: colors.ink, paddingVertical: 0 }}
        />
        {searching ? (
          <ActivityIndicator size="small" color={colors.brand} />
        ) : query ? (
          <Pressable hitSlop={10} onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={18} color={colors.subtle} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 14 }}>
        <Chip label="All" selected={!category} onPress={() => setCategory(null)} className="mr-2" />
        {CATEGORIES.map((c) => (
          <Chip
            key={c.label}
            label={c.label}
            icon={c.icon as any}
            selected={category === c.label}
            onPress={() => setCategory(category === c.label ? null : c.label)}
            className="mr-2"
          />
        ))}
      </ScrollView>

      {remote.length > 0 && (
        <View className="mx-5 mb-4 rounded-3xl bg-white p-2" style={shadow(1)}>
          <Text className="px-2 pb-1 pt-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">Places worldwide</Text>
          {remote.map((s) => (
            <Pressable key={s.id} onPress={() => openRemote(s)} className="flex-row items-center rounded-2xl px-2 py-2.5 active:bg-slate-50">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-brand-50">
                <Ionicons name="location" size={16} color={colors.brand} />
              </View>
              <View className="flex-1">
                <Text numberOfLines={1} className="text-[15px] font-semibold text-slate-900">
                  {s.title}
                </Text>
                {!!s.subtitle && (
                  <Text numberOfLines={1} className="text-xs text-slate-500">
                    {s.subtitle}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.subtle} />
            </Pressable>
          ))}
        </View>
      )}

      {results.length > 0 && (
        <Text className="mb-3 px-5 text-xs font-bold uppercase tracking-wider text-slate-400">
          {category ? `${category} · ` : ""}
          {results.length} curated {results.length === 1 ? "guide" : "guides"}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50">
      <FlatList
        data={results}
        keyExtractor={(d) => d.id}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        initialNumToRender={4}
        windowSize={7}
        renderItem={({ item }) => (
          <View className="px-5">
            <DestinationCard size="list" destination={item} onPress={() => navigation.navigate("Destination", { id: item.id })} />
          </View>
        )}
        ListEmptyComponent={
          remote.length === 0 && !searching ? (
            <EmptyState
              icon="compass-outline"
              title="No guides match yet"
              subtitle="Try another search or start a trip anywhere in the world."
              action={{ title: "Plan a custom trip", icon: "add", onPress: () => navigation.navigate("NewTrip") }}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export default ExploreScreen;

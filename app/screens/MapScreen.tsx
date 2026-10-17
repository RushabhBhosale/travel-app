import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, FlatList, Linking, Platform, Pressable, ScrollView, Text, View, ViewToken } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import AppImage from "../components/ui/AppImage";
import Chip from "../components/ui/Chip";
import EmptyState from "../components/ui/EmptyState";
import IconButton from "../components/ui/IconButton";
import { useTrip } from "../lib/queries";
import { directionsUrl } from "../lib/places";
import { tripDays } from "../lib/format";
import { dayColor, shadow } from "../theme";
import type { Place } from "../lib/types";
import type { ScreenProps } from "../navigation/types";

const { width } = Dimensions.get("window");
const CARD_W = width * 0.78;
const GAP = 12;

type Pin = Place & { key: string; color: string; label: string; lat: number; lng: number };

const hasCoords = (p: Place) => {
  const l = p.geometry?.location;
  return !!l && (l.lat !== 0 || l.lng !== 0);
};

const MapScreen = ({ route, navigation }: ScreenProps<"Map">) => {
  const insets = useSafeAreaInsets();
  const { data: trip } = useTrip(route.params.tripId);
  const [filter, setFilter] = useState<string>(route.params.day ?? "all");
  const [selected, setSelected] = useState(0);
  const mapRef = useRef<MapView>(null);
  const listRef = useRef<FlatList<Pin>>(null);

  const days = trip ? tripDays(trip) : [];

  const pins = useMemo<Pin[]>(() => {
    if (!trip) return [];
    const out: Pin[] = [];
    if (filter === "all" || filter === "saved") {
      trip.placesToVisit.filter(hasCoords).forEach((p, i) =>
        out.push({ ...p, key: `s${i}`, color: "#0F172A", label: "★", lat: p.geometry!.location.lat, lng: p.geometry!.location.lng })
      );
    }
    days.forEach((d) => {
      if (filter !== "all" && filter !== d.value) return;
      const entry = trip.itinerary.find((x) => x.date === d.value);
      entry?.activities.filter(hasCoords).forEach((a, i) =>
        out.push({ ...a, key: `${d.value}-${i}`, color: dayColor(d.index), label: `${i + 1}`, lat: a.geometry!.location.lat, lng: a.geometry!.location.lng })
      );
    });
    return out;
  }, [trip, filter]);

  const fitAll = useCallback(() => {
    if (!pins.length) return;
    if (pins.length === 1) {
      mapRef.current?.animateToRegion({ latitude: pins[0].lat, longitude: pins[0].lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 400);
      return;
    }
    mapRef.current?.fitToCoordinates(
      pins.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      { edgePadding: { top: insets.top + 120, right: 60, bottom: 260, left: 60 }, animated: true }
    );
  }, [pins, insets.top]);

  useEffect(() => {
    setSelected(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    const t = setTimeout(fitAll, 350);
    return () => clearTimeout(t);
  }, [fitAll]);

  const focus = (i: number) => {
    const p = pins[i];
    if (!p) return;
    setSelected(i);
    mapRef.current?.animateToRegion({ latitude: p.lat, longitude: p.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 350);
  };

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) focusRef.current(first.index);
  }).current;
  const focusRef = useRef(focus);
  focusRef.current = focus;

  const center = trip?.location && (trip.location.lat || trip.location.lng) ? trip.location : pins[0] ? { lat: pins[0].lat, lng: pins[0].lng } : { lat: 20.59, lng: 78.96 };

  return (
    <View className="flex-1 bg-slate-100">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: pins.length ? 0.3 : 20, longitudeDelta: pins.length ? 0.3 : 20 }}
        showsUserLocation={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
        onMapReady={fitAll}
      >
        {pins.map((p, i) => (
          <Marker
            key={p.key}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            onPress={() => {
              focus(i);
              listRef.current?.scrollToIndex({ index: i, animated: true });
            }}
            tracksViewChanges={false}
            zIndex={i === selected ? 10 : 1}
          >
            <View
              className="items-center justify-center rounded-full border-2 border-white"
              style={{ backgroundColor: p.color, width: i === selected ? 34 : 26, height: i === selected ? 34 : 26, ...shadow(2) }}
            >
              <Text className="text-xs font-bold text-white">{p.label}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View className="absolute left-0 right-0" style={{ top: insets.top + 8 }}>
        <View className="flex-row items-center px-4">
          <IconButton tone="glass" name="chevron-back" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
          <View className="ml-3 flex-1 rounded-full bg-white/95 px-4 py-2" style={shadow(1)}>
            <Text numberOfLines={1} className="text-[15px] font-bold text-slate-900">
              {trip?.tripName ?? "Map"}
            </Text>
          </View>
          <IconButton tone="glass" name="scan-outline" onPress={fitAll} accessibilityLabel="Show all" className="ml-3" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Chip label="All" selected={filter === "all"} onPress={() => setFilter("all")} className="mr-2" />
          <Chip label="Saved" icon="bookmark" selected={filter === "saved"} color="#0F172A" onPress={() => setFilter("saved")} className="mr-2" />
          {days.map((d) => (
            <Chip key={d.value} label={`Day ${d.index + 1}`} selected={filter === d.value} color={dayColor(d.index)} onPress={() => setFilter(d.value)} className="mr-2" />
          ))}
        </ScrollView>
      </View>

      <View className="absolute left-0 right-0" style={{ bottom: insets.bottom + 16 }}>
        {pins.length === 0 ? (
          <View className="mx-5 rounded-3xl bg-white" style={shadow(2)}>
            <EmptyState compact icon="map-outline" title="Nothing on the map yet" subtitle="Add places or itinerary stops and they'll appear here." />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={pins}
            keyExtractor={(p) => p.key}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_W + GAP}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: (width - CARD_W) / 2 - GAP / 2 }}
            onViewableItemsChanged={onViewable}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            getItemLayout={(_, i) => ({ length: CARD_W + GAP, offset: (CARD_W + GAP) * i, index: i })}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => focus(index)}
                className="flex-row overflow-hidden rounded-3xl bg-white p-2.5"
                style={[{ width: CARD_W, marginHorizontal: GAP / 2 }, shadow(2)]}
              >
                <AppImage source={item.photos?.[0]} style={{ width: 76, height: 76, borderRadius: 18 }} fallbackIcon="location" />
                <View className="ml-3 flex-1 justify-center">
                  <View className="mb-0.5 flex-row items-center">
                    <View className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <Text className="text-[11px] font-semibold uppercase text-slate-400">{item.label === "★" ? "Saved" : `Stop ${item.label}`}</Text>
                  </View>
                  <Text numberOfLines={1} className="text-[15px] font-bold text-slate-900">
                    {item.name}
                  </Text>
                  <Text numberOfLines={2} className="text-xs text-slate-500">
                    {item.formatted_address || item.briefDescription}
                  </Text>
                </View>
                <Pressable
                  onPress={() => Linking.openURL(directionsUrl({ lat: item.lat, lng: item.lng }))}
                  className="ml-2 h-10 w-10 items-center justify-center self-center rounded-full bg-blue-50"
                  accessibilityLabel="Directions"
                >
                  <Ionicons name="navigate" size={18} color="#2563EB" />
                </Pressable>
              </Pressable>
            )}
          />
        )}
      </View>
    </View>
  );
};

export default MapScreen;

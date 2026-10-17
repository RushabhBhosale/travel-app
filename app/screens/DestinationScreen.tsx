import React from "react";
import { Linking, Pressable, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppImage from "../components/ui/AppImage";
import Button from "../components/ui/Button";
import IconButton from "../components/ui/IconButton";
import Skeleton from "../components/ui/Skeleton";
import WeatherStrip from "../components/WeatherStrip";
import { destinationById } from "../data/destinations";
import { useWikiSummary } from "../lib/wiki";
import { mapsSearchUrl } from "../lib/places";
import { colors, shadow } from "../theme";
import type { ScreenProps } from "../navigation/types";

const Fact = ({ icon, label, value }: { icon: any; label: string; value: string }) => (
  <View className="flex-1 items-center rounded-2xl bg-white px-2 py-3" style={shadow(1)}>
    <Ionicons name={icon} size={18} color={colors.brand} />
    <Text className="mt-1 text-[11px] font-medium text-slate-400">{label}</Text>
    <Text numberOfLines={1} className="text-[13px] font-bold text-slate-900">
      {value}
    </Text>
  </View>
);

const DestinationScreen = ({ route, navigation }: ScreenProps<"Destination">) => {
  const insets = useSafeAreaInsets();
  const curated = destinationById(route.params.id);
  const place = route.params.place;
  const name = curated?.name ?? place?.name ?? "Destination";
  const region = curated?.region ?? place?.subtitle ?? "";
  const location = curated?.location ?? (place ? { lat: place.lat, lng: place.lng } : undefined);

  const { data: wiki, isLoading: wikiLoading } = useWikiSummary(curated?.wiki ?? place?.name);
  const image = curated?.image ?? wiki?.image;

  const share = () =>
    Share.share({
      message: `${name}${region ? `, ${region}` : ""}\n${curated?.tagline ?? wiki?.extract?.slice(0, 160) ?? ""}${
        curated ? `\nBest time to visit: ${curated.bestTime}` : ""
      }`,
    });

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <AppImage source={image} scrim style={{ height: 380 }} priority="high" fallbackIcon="earth">
          <View className="absolute left-0 right-0 flex-row justify-between px-4" style={{ top: insets.top + 6 }}>
            <IconButton tone="glass" name="chevron-back" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
            <IconButton tone="glass" name="share-outline" onPress={share} accessibilityLabel="Share" />
          </View>
          <View className="absolute bottom-0 left-0 right-0 px-5 pb-9">
            {!!region && (
              <View className="mb-1 flex-row items-center">
                <Ionicons name="location" size={14} color="#FED7AA" />
                <Text className="ml-1 text-sm font-medium text-orange-100">{region}</Text>
              </View>
            )}
            <Text className="text-[34px] font-extrabold tracking-tight text-white">{name}</Text>
            {!!curated?.tagline && <Text className="mt-1 text-[15px] text-slate-200">{curated.tagline}</Text>}
          </View>
        </AppImage>

        <View className="-mt-5 rounded-t-[28px] bg-slate-50 px-5 pt-5">
          {curated && (
            <View className="mb-5 flex-row gap-3">
              <Fact icon="calendar-outline" label="Best time" value={curated.bestTime} />
              <Fact icon="time-outline" label="Ideal stay" value={curated.idealDays} />
              <Fact icon="pricetags-outline" label="Vibe" value={curated.categories[0]} />
            </View>
          )}

          <Text className="mb-2 text-lg font-bold text-slate-900">About</Text>
          {wikiLoading ? (
            <View className="mb-5">
              <Skeleton style={{ height: 14, marginBottom: 8 }} />
              <Skeleton style={{ height: 14, marginBottom: 8, width: "92%" }} />
              <Skeleton style={{ height: 14, width: "70%" }} />
            </View>
          ) : (
            <View className="mb-5">
              <Text className="text-[15px] leading-6 text-slate-600">
                {wiki?.extract || curated?.tagline || "No description available yet."}
              </Text>
              {!!wiki?.url && (
                <Pressable onPress={() => Linking.openURL(wiki.url!)} className="mt-2 self-start" hitSlop={8}>
                  <Text className="text-sm font-semibold text-brand">Read more on Wikipedia</Text>
                </Pressable>
              )}
            </View>
          )}

          <WeatherStrip location={location} title={`Weather in ${name}`} />

          {curated && (
            <>
              <Text className="mb-3 text-lg font-bold text-slate-900">Top things to do</Text>
              <View className="mb-5 rounded-3xl bg-white px-4 py-1" style={shadow(1)}>
                {curated.attractions.map((a, i) => (
                  <Pressable
                    key={a}
                    onPress={() => Linking.openURL(mapsSearchUrl(`${a}, ${curated.name}`))}
                    className={`flex-row items-center py-3.5 active:opacity-60 ${i < curated.attractions.length - 1 ? "border-b border-slate-100" : ""}`}
                  >
                    <View className="mr-3 h-7 w-7 items-center justify-center rounded-full bg-brand-50">
                      <Text className="text-xs font-bold text-brand-600">{i + 1}</Text>
                    </View>
                    <Text className="flex-1 text-[15px] font-medium text-slate-800">{a}</Text>
                    <Ionicons name="open-outline" size={16} color={colors.subtle} />
                  </Pressable>
                ))}
              </View>

              <Text className="mb-3 text-lg font-bold text-slate-900">Good to know</Text>
              <View className="mb-5 rounded-3xl bg-amber-50 p-4">
                {curated.tips.map((t) => (
                  <View key={t} className="mb-2 flex-row">
                    <Ionicons name="bulb-outline" size={16} color="#B45309" style={{ marginTop: 2 }} />
                    <Text className="ml-2 flex-1 text-sm leading-5 text-amber-900">{t}</Text>
                  </View>
                ))}
              </View>

              <Text className="text-[11px] text-slate-400">
                Photo: {curated.credit.author}, {curated.credit.license}, via Wikimedia Commons
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 flex-row gap-3 border-t border-slate-100 bg-white px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 14) }}
      >
        <Button
          title="Ask AI"
          icon="sparkles"
          variant="secondary"
          className="flex-1"
          onPress={() => navigation.navigate("AIChat", { destination: curated ? `${curated.name}, ${curated.region}` : [name, region].filter(Boolean).join(", ") })}
        />
        <Button
          title="Plan a trip here"
          icon="airplane"
          className="flex-[1.4]"
          onPress={() => navigation.navigate("NewTrip", curated ? { destinationId: curated.id } : { place })}
        />
      </View>
    </View>
  );
};

export default DestinationScreen;

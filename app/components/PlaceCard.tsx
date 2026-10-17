import React, { memo, useState } from "react";
import { Alert, LayoutAnimation, Linking, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import AppImage from "./ui/AppImage";
import { colors, shadow } from "../theme";
import { directionsUrl, mapsSearchUrl } from "../lib/places";
import { titleCase } from "../lib/format";
import type { Place } from "../lib/types";

type Action = { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void; color?: string };

type Props = {
  place: Place;
  /** Number badge on the photo, used for itinerary order. */
  badge?: { text: string; color: string };
  onRemove?: () => void;
  extraAction?: Action;
};

const ActionPill = ({ icon, label, onPress, color = colors.text }: Action) => (
  <Pressable onPress={onPress} className="mb-2 mr-2 h-9 flex-row items-center rounded-full bg-white px-3 active:opacity-60" style={shadow(1)}>
    <Ionicons name={icon} size={15} color={color} />
    <Text className="ml-1.5 text-[13px] font-semibold" style={{ color }}>
      {label}
    </Text>
  </Pressable>
);

const PlaceCard = ({ place, badge, onRemove, extraAction }: Props) => {
  const [open, setOpen] = useState(false);
  const loc = place.geometry?.location;
  const hasLoc = !!loc && (loc.lat !== 0 || loc.lng !== 0);
  const rating = place.rating ?? avgRating(place);
  const todayHours = place.openingHours?.find((l) => l.toLowerCase().startsWith(dayjs().format("dddd").toLowerCase()));

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  const confirmRemove = () =>
    Alert.alert("Remove place?", `Remove ${place.name} from this trip?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: onRemove },
    ]);

  return (
    <View className="mb-3 overflow-hidden rounded-3xl bg-white" style={shadow(1)}>
      <Pressable onPress={toggle} className="flex-row p-2.5 active:opacity-80">
        <AppImage source={place.photos?.[0]} style={{ width: 84, height: 84, borderRadius: 18 }} fallbackIcon="location">
          {badge && (
            <View className="absolute left-1.5 top-1.5 h-6 min-w-6 items-center justify-center rounded-full px-1.5" style={{ backgroundColor: badge.color }}>
              <Text className="text-xs font-bold text-white">{badge.text}</Text>
            </View>
          )}
        </AppImage>
        <View className="ml-3 flex-1 justify-center">
          <Text numberOfLines={1} className="text-[15px] font-bold text-slate-900">
            {place.name}
          </Text>
          {rating ? (
            <View className="mt-0.5 flex-row items-center">
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text className="ml-1 text-xs font-semibold text-slate-700">{rating.toFixed(1)}</Text>
              {!!place.types?.[0] && <Text className="ml-1.5 text-xs text-slate-400">· {titleCase(place.types[0])}</Text>}
            </View>
          ) : place.types?.[0] ? (
            <Text className="mt-0.5 text-xs text-slate-400">{titleCase(place.types[0])}</Text>
          ) : null}
          {!!place.briefDescription && (
            <Text numberOfLines={open ? undefined : 2} className="mt-1 text-[13px] leading-[18px] text-slate-500">
              {place.briefDescription}
            </Text>
          )}
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.subtle} style={{ alignSelf: "center", marginLeft: 4 }} />
      </Pressable>

      {open && (
        <View className="border-t border-slate-100 bg-slate-50 px-3.5 pb-1.5 pt-3">
          {!!place.formatted_address && <Detail icon="location-outline" text={place.formatted_address} />}
          {!!todayHours && <Detail icon="time-outline" text={todayHours} />}
          {!!place.phoneNumber && <Detail icon="call-outline" text={place.phoneNumber} />}
          {!!place.reviews?.[0]?.text && (
            <Detail icon="chatbubble-ellipses-outline" text={`"${place.reviews[0].text.slice(0, 140).trim()}${place.reviews[0].text.length > 140 ? "…" : ""}" — ${place.reviews[0].authorName}`} />
          )}
          <View className="mt-1 flex-row flex-wrap">
            {extraAction && <ActionPill {...extraAction} />}
            <ActionPill
              icon="navigate"
              label="Directions"
              color="#2563EB"
              onPress={() => Linking.openURL(hasLoc ? directionsUrl(loc!) : mapsSearchUrl(`${place.name} ${place.formatted_address ?? ""}`))}
            />
            {!!place.website && <ActionPill icon="globe-outline" label="Website" onPress={() => Linking.openURL(place.website!)} />}
            {!!place.phoneNumber && (
              <ActionPill icon="call-outline" label="Call" onPress={() => Linking.openURL(`tel:${place.phoneNumber!.replace(/\s/g, "")}`)} />
            )}
            {onRemove && <ActionPill icon="trash-outline" label="Remove" color={colors.danger} onPress={confirmRemove} />}
          </View>
        </View>
      )}
    </View>
  );
};

const Detail = ({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }) => (
  <View className="mb-2.5 flex-row">
    <Ionicons name={icon} size={15} color={colors.muted} style={{ marginTop: 1 }} />
    <Text className="ml-2 flex-1 text-[13px] leading-[18px] text-slate-600">{text}</Text>
  </View>
);

function avgRating(p: Place) {
  const r = p.reviews?.filter((x) => x.rating) ?? [];
  return r.length ? r.reduce((s, x) => s + x.rating, 0) / r.length : undefined;
}

export default memo(PlaceCard);

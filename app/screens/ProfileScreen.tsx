import React, { useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useClerk, useUser } from "@clerk/clerk-expo";
import AppImage from "../components/ui/AppImage";
import Chip from "../components/ui/Chip";
import Sheet from "../components/ui/Sheet";
import { useTrips } from "../lib/queries";
import { CURRENCIES, formatMoney, tripLength, tripStatus } from "../lib/format";
import { updateSettings, useSettings } from "../lib/settings";
import { APP_NAME } from "../lib/config";
import { colors, shadow } from "../theme";
import type { RootNav } from "../navigation/types";

const Row = ({ icon, label, value, onPress, danger }: { icon: any; label: string; value?: string; onPress: () => void; danger?: boolean }) => (
  <Pressable onPress={onPress} className="flex-row items-center px-4 py-3.5 active:bg-slate-50">
    <View className={`mr-3 h-9 w-9 items-center justify-center rounded-xl ${danger ? "bg-red-50" : "bg-slate-100"}`}>
      <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.text} />
    </View>
    <Text className={`flex-1 text-[15px] font-medium ${danger ? "text-red-600" : "text-slate-800"}`}>{label}</Text>
    {!!value && <Text className="mr-1 text-sm text-slate-400">{value}</Text>}
    {!danger && <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />}
  </Pressable>
);

const ProfileScreen = () => {
  const navigation = useNavigation<RootNav>();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: trips } = useTrips();
  const settings = useSettings();
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const stats = useMemo(() => {
    const list = trips ?? [];
    return {
      trips: list.length,
      days: list.reduce((n, t) => n + tripLength(t), 0),
      places: list.reduce((n, t) => n + t.placesToVisit.length + t.itinerary.reduce((m, d) => m + d.activities.length, 0), 0),
      completed: list.filter((t) => tripStatus(t).phase === "past").length,
      spent: list.filter((t) => (t.currency ?? "INR") === settings.currency).reduce((s, t) => s + t.expenses.reduce((a, e) => a + e.price, 0), 0),
    };
  }, [trips, settings.currency]);

  const confirmSignOut = () =>
    Alert.alert("Sign out?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut().catch(() => {}) },
    ]);

  const email = user?.primaryEmailAddress?.emailAddress;
  const memberSince = user?.createdAt ? new Date(user.createdAt).getFullYear() : undefined;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="items-center px-5 pb-6 pt-6">
          <View style={shadow(2)} className="rounded-full">
            <AppImage source={user?.imageUrl} fallbackIcon="person" style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: "#fff" }} />
          </View>
          <Text className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{user?.fullName || email?.split("@")[0] || "Traveller"}</Text>
          {!!email && <Text className="mt-0.5 text-sm text-slate-500">{email}</Text>}
          {!!memberSince && <Text className="mt-1 text-xs text-slate-400">Exploring with {APP_NAME} since {memberSince}</Text>}
        </View>

        <View className="mx-5 mb-6 flex-row rounded-3xl bg-white py-4" style={shadow(1)}>
          {[
            { label: "Trips", value: stats.trips },
            { label: "Days", value: stats.days },
            { label: "Places", value: stats.places },
            { label: "Completed", value: stats.completed },
          ].map((s, i) => (
            <View key={s.label} className={`flex-1 items-center ${i > 0 ? "border-l border-slate-100" : ""}`}>
              <Text className="text-xl font-bold text-slate-900">{s.value}</Text>
              <Text className="text-xs text-slate-500">{s.label}</Text>
            </View>
          ))}
        </View>

        {stats.spent > 0 && (
          <View className="mx-5 mb-6 flex-row items-center rounded-3xl bg-emerald-50 p-4">
            <Ionicons name="wallet" size={20} color={colors.success} />
            <Text className="ml-2.5 flex-1 text-sm text-emerald-900">
              You've tracked <Text className="font-bold">{formatMoney(stats.spent, settings.currency)}</Text> in travel expenses
            </Text>
          </View>
        )}

        <Text className="mb-2 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Preferences</Text>
        <View className="mx-5 mb-6 overflow-hidden rounded-3xl bg-white" style={shadow(1)}>
          <Row icon="cash-outline" label="Default currency" value={settings.currency} onPress={() => setCurrencyOpen(true)} />
        </View>

        <Text className="mb-2 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">About</Text>
        <View className="mx-5 mb-6 overflow-hidden rounded-3xl bg-white" style={shadow(1)}>
          <Row icon="images-outline" label="Photo credits" onPress={() => navigation.navigate("PhotoCredits")} />
          <View className="mx-4 h-px bg-slate-100" />
          <Row icon="cloud-outline" label="Weather data by Open-Meteo" onPress={() => Linking.openURL("https://open-meteo.com")} />
          <View className="mx-4 h-px bg-slate-100" />
          <Row icon="map-outline" label="Places © OpenStreetMap & Google" onPress={() => Linking.openURL("https://www.openstreetmap.org/copyright")} />
        </View>

        <View className="mx-5 overflow-hidden rounded-3xl bg-white" style={shadow(1)}>
          <Row icon="log-out-outline" label="Sign out" onPress={confirmSignOut} danger />
        </View>
      </ScrollView>

      <Sheet visible={currencyOpen} onClose={() => setCurrencyOpen(false)} title="Default currency" subtitle="Used for new trips">
        <View className="flex-row flex-wrap px-5 pb-2">
          {CURRENCIES.map((c) => (
            <Chip
              key={c.code}
              label={`${c.symbol.trim()}  ${c.code}`}
              selected={settings.currency === c.code}
              onPress={() => {
                updateSettings({ currency: c.code });
                setCurrencyOpen(false);
              }}
              className="mb-2 mr-2"
            />
          ))}
        </View>
      </Sheet>
    </SafeAreaView>
  );
};

export default ProfileScreen;

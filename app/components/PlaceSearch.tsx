import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Keyboard, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { PlaceSuggestion, searchPlaces } from "../lib/places";
import type { LatLng } from "../lib/types";

type Props = {
  onSelect: (s: PlaceSuggestion) => void;
  placeholder?: string;
  autoFocus?: boolean;
  near?: LatLng;
  /** Rendered under the input while the query is empty. */
  emptyContent?: React.ReactNode;
  busyId?: string | null;
};

/** Debounced place search with Google → OpenStreetMap fallback. */
const PlaceSearch = ({ onSelect, placeholder = "Search places", autoFocus, near, emptyContent, busyId }: Props) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchPlaces(q, controller.signal, near);
        setResults(r);
        setError(false);
      } catch (e: any) {
        if (e?.name !== "AbortError") setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, near?.lat, near?.lng]);

  return (
    <View style={{ flex: 1 }}>
      <View className="mx-5 h-12 flex-row items-center rounded-2xl bg-slate-100 px-3.5">
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          ref={input}
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={colors.subtle}
          autoFocus={autoFocus}
          autoCorrect={false}
          returnKeyType="search"
          style={{ flex: 1, marginLeft: 8, fontSize: 15, color: colors.ink, paddingVertical: 0 }}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.brand} />
        ) : query ? (
          <Pressable hitSlop={10} onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={18} color={colors.subtle} />
          </Pressable>
        ) : null}
      </View>

      {query.trim().length < 2 ? (
        emptyContent
      ) : (
        <FlatList
          data={results}
          keyExtractor={(i) => i.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}
          ListEmptyComponent={
            !loading ? (
              <Text className="py-8 text-center text-sm text-slate-500">
                {error ? "Search is unavailable. Check your connection." : "No places found. Try another name."}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                onSelect(item);
              }}
              disabled={!!busyId}
              className="flex-row items-center border-b border-slate-100 py-3 active:opacity-60"
            >
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                <Ionicons name="location" size={18} color={colors.brand} />
              </View>
              <View className="flex-1">
                <Text numberOfLines={1} className="text-[15px] font-semibold text-slate-900">
                  {item.title}
                </Text>
                {!!item.subtitle && (
                  <Text numberOfLines={1} className="mt-0.5 text-[13px] text-slate-500">
                    {item.subtitle}
                  </Text>
                )}
              </View>
              {busyId === item.id ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <Ionicons name="add-circle-outline" size={22} color={colors.subtle} />
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
};

export default PlaceSearch;

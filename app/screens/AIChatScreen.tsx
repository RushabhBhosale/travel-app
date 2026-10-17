import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Share, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenHeader from "../components/ui/ScreenHeader";
import IconButton from "../components/ui/IconButton";
import { toast } from "../components/ui/Toast";
import { api, getErrorMessage } from "../lib/api";
import { useTrip } from "../lib/queries";
import { formatDateRange } from "../lib/format";
import { colors } from "../theme";
import type { ChatMessage } from "../lib/types";
import type { ScreenProps } from "../navigation/types";

/** Light formatting for model output: bullets and stray markdown. */
const FormattedText = ({ text }: { text: string }) => {
  const lines = text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#+\s*/gm, "").split("\n");
  return (
    <View>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <View key={i} className="h-2" />;
        const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
        if (bullet) {
          const num = line.trim().match(/^(\d+)[.)]/)?.[1];
          return (
            <View key={i} className="mb-1 flex-row">
              <Text className="w-5 text-[15px] leading-[22px] text-slate-500">{num ? `${num}.` : "•"}</Text>
              <Text className="flex-1 text-[15px] leading-[22px] text-slate-800">{bullet[1]}</Text>
            </View>
          );
        }
        return (
          <Text key={i} className="text-[15px] leading-[22px] text-slate-800">
            {line}
          </Text>
        );
      })}
    </View>
  );
};

const Bubble = memo(({ msg, onEmail }: { msg: ChatMessage; onEmail: (t: string) => void }) => {
  if (msg.role === "user") {
    return (
      <View className="mb-3 max-w-[85%] self-end rounded-3xl rounded-br-lg bg-brand px-4 py-3">
        <Text className="text-[15px] leading-[21px] text-white">{msg.content}</Text>
      </View>
    );
  }
  return (
    <View className="mb-4 flex-row">
      <View className="mr-2 mt-1 h-7 w-7 items-center justify-center rounded-full bg-violet-600">
        <Ionicons name="sparkles" size={14} color="#fff" />
      </View>
      <View className="flex-1">
        <View className={`rounded-3xl rounded-tl-lg px-4 py-3 ${msg.error ? "bg-red-50" : "bg-white"}`} style={{ borderWidth: 1, borderColor: msg.error ? "#FECACA" : colors.border }}>
          {msg.error ? <Text className="text-[15px] text-red-700">{msg.content}</Text> : <FormattedText text={msg.content} />}
        </View>
        {!msg.error && (
          <View className="ml-2 mt-1.5 flex-row">
            <Pressable hitSlop={6} onPress={() => Share.share({ message: msg.content })} className="mr-4 flex-row items-center">
              <Ionicons name="share-outline" size={14} color={colors.muted} />
              <Text className="ml-1 text-xs font-medium text-slate-500">Share</Text>
            </Pressable>
            <Pressable hitSlop={6} onPress={() => onEmail(msg.content)} className="flex-row items-center">
              <Ionicons name="mail-outline" size={14} color={colors.muted} />
              <Text className="ml-1 text-xs font-medium text-slate-500">Email me</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
});

const AIChatScreen = ({ route }: ScreenProps<"AIChat">) => {
  const tripId = route.params?.tripId;
  const { data: trip } = useTrip(tripId ?? "", undefined);
  const destination = trip?.tripName ?? route.params?.destination;
  const storageKey = `chat:${tripId ?? destination ?? "general"}`;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((raw) => raw && setMessages(JSON.parse(raw)))
      .catch(() => {});
  }, [storageKey]);

  useEffect(() => {
    if (messages.length) AsyncStorage.setItem(storageKey, JSON.stringify(messages.slice(-40))).catch(() => {});
  }, [messages, storageKey]);

  const place = destination?.split(",")[0];
  const suggestions = useMemo(
    () =>
      place
        ? [`Must-try food in ${place}`, `Plan a perfect day in ${place}`, `How do I get around ${place}?`, `What should I pack for ${place}?`, `Hidden gems in ${place}`]
        : ["Where should I go for a 3-day trip in December?", "Best budget destinations in Asia", "Tips for travelling with kids", "How do I avoid jet lag?"],
    [place]
  );

  const context = useMemo(
    () => ({
      destination,
      startDate: trip?.startDate,
      endDate: trip?.endDate,
      places: trip ? [...trip.placesToVisit.map((p) => p.name), ...trip.itinerary.flatMap((d) => d.activities.map((a) => a.name))] : undefined,
    }),
    [destination, trip]
  );

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const reply = await api.chat(next, context);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: getErrorMessage(err, "Sorry, I couldn't answer that. Please try again."), error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const email = (content: string) =>
    Alert.alert("Email this answer?", "We'll send it to the email on your account.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send",
        onPress: async () => {
          try {
            const msg = await api.sendEmail(`Travel tips${destination ? ` for ${destination}` : ""}`, content);
            toast.success(msg);
          } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't send the email"));
          }
        },
      },
    ]);

  const clear = () =>
    Alert.alert("Clear conversation?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setMessages([]);
          AsyncStorage.removeItem(storageKey).catch(() => {});
        },
      },
    ]);

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-slate-50">
      <ScreenHeader
        title="AI travel assistant"
        subtitle={destination ? `${destination}${trip ? ` · ${formatDateRange(trip.startDate, trip.endDate)}` : ""}` : "Ask anything about travel"}
        right={messages.length > 0 ? <IconButton name="trash-outline" size={18} onPress={clear} accessibilityLabel="Clear conversation" /> : undefined}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16, paddingBottom: 8, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => <Bubble msg={item} onEmail={email} />}
          ListEmptyComponent={
            <View className="flex-1 justify-center">
              <View className="mb-5 items-center">
                <View className="mb-3 h-16 w-16 items-center justify-center rounded-3xl bg-violet-600">
                  <Ionicons name="sparkles" size={28} color="#fff" />
                </View>
                <Text className="text-xl font-bold text-slate-900">How can I help?</Text>
                <Text className="mt-1 px-6 text-center text-sm leading-5 text-slate-500">
                  Ask about places, food, routes, budgets or local tips. Answers are AI-generated, so double-check important details.
                </Text>
              </View>
              {suggestions.map((s) => (
                <Pressable key={s} onPress={() => send(s)} className="mb-2 flex-row items-center rounded-2xl bg-white px-4 py-3.5 active:opacity-70" style={{ borderWidth: 1, borderColor: colors.border }}>
                  <Ionicons name="chatbubble-ellipses-outline" size={17} color={colors.ai} />
                  <Text className="ml-2.5 flex-1 text-[15px] text-slate-800">{s}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.subtle} />
                </Pressable>
              ))}
            </View>
          }
          ListFooterComponent={
            loading ? (
              <View className="mb-4 flex-row items-center">
                <View className="mr-2 h-7 w-7 items-center justify-center rounded-full bg-violet-600">
                  <Ionicons name="sparkles" size={14} color="#fff" />
                </View>
                <View className="flex-row items-center rounded-3xl bg-white px-4 py-3" style={{ borderWidth: 1, borderColor: colors.border }}>
                  <ActivityIndicator size="small" color={colors.ai} />
                  <Text className="ml-2 text-sm text-slate-500">Thinking…</Text>
                </View>
              </View>
            ) : null
          }
        />

        <View className="flex-row items-end border-t border-slate-200 bg-white px-3 py-2.5">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your trip…"
            placeholderTextColor={colors.subtle}
            multiline
            maxLength={1000}
            style={{ flex: 1, maxHeight: 120, minHeight: 44, backgroundColor: colors.bg, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15, color: colors.ink }}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
            className={`ml-2 h-11 w-11 items-center justify-center rounded-full ${input.trim() && !loading ? "bg-violet-600" : "bg-slate-200"}`}
            accessibilityLabel="Send"
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AIChatScreen;

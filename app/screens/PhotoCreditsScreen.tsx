import React from "react";
import { FlatList, Linking, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppImage from "../components/ui/AppImage";
import ScreenHeader from "../components/ui/ScreenHeader";
import { DESTINATIONS } from "../data/destinations";
import { colors } from "../theme";

const PhotoCreditsScreen = () => (
  <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50">
    <ScreenHeader title="Photo credits" subtitle="Destination photos from Wikimedia Commons" />
    <FlatList
      data={DESTINATIONS}
      keyExtractor={(d) => d.id}
      contentContainerStyle={{ padding: 20 }}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => Linking.openURL(`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(item.credit.file)}`)}
          className="mb-2.5 flex-row items-center rounded-2xl bg-white p-2.5 active:opacity-70"
        >
          <AppImage source={item.image} style={{ width: 48, height: 48, borderRadius: 12 }} />
          <View className="ml-3 flex-1">
            <Text className="text-sm font-semibold text-slate-900">{item.name}</Text>
            <Text numberOfLines={1} className="text-xs text-slate-500">
              {item.credit.author} · {item.credit.license}
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.subtle} />
        </Pressable>
      )}
    />
  </SafeAreaView>
);

export default PhotoCreditsScreen;

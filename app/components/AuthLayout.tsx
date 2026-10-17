import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppImage from "./ui/AppImage";
import { APP_NAME } from "../lib/config";
import { destinationById } from "../data/destinations";

type Props = { title: string; subtitle: string; children: React.ReactNode; image?: string };

const AuthLayout = ({ title, subtitle, children, image = "santorini" }: Props) => {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#fff" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" bounces={false} contentContainerStyle={{ flexGrow: 1 }}>
        <AppImage source={destinationById(image)?.image} scrim style={{ height: 300 + insets.top }} priority="high">
          <View className="absolute bottom-0 left-0 right-0 px-6 pb-12">
            <View className="mb-3 flex-row items-center">
              <View className="mr-2 h-9 w-9 items-center justify-center rounded-xl bg-brand">
                <Ionicons name="paper-plane" size={18} color="#fff" />
              </View>
              <Text className="text-xl font-extrabold tracking-tight text-white">{APP_NAME}</Text>
            </View>
            <Text className="text-[15px] text-slate-200">Plan smarter trips with AI, maps and budgets in one place.</Text>
          </View>
        </AppImage>
        <View className="-mt-6 flex-1 rounded-t-[28px] bg-white px-6 pt-7" style={{ paddingBottom: insets.bottom + 24 }}>
          <Text className="text-2xl font-bold tracking-tight text-slate-900">{title}</Text>
          <Text className="mb-6 mt-1 text-sm text-slate-500">{subtitle}</Text>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AuthLayout;

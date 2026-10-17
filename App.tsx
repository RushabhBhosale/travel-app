import "./global.css";
import React, { useEffect } from "react";
import { Platform, UIManager } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { enableFreeze } from "react-native-screens";
import { ClerkProvider } from "@clerk/clerk-expo";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import * as SecureStore from "expo-secure-store";
import RootNavigator from "./app/navigation/RootNavigator";
import { ToastHost } from "./app/components/ui/Toast";
import { queryClient, queryPersister } from "./app/lib/queries";
import { warmUp } from "./app/lib/api";
import { CLERK_PUBLISHABLE_KEY } from "./app/lib/config";
import { colors } from "./app/theme";

// Screens that aren't visible stop re-rendering.
enableFreeze(true);

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },
};

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colors.brand, background: colors.bg, card: "#fff", text: colors.ink, border: colors.border },
};

export default function App() {
  useEffect(() => {
    warmUp();
  }, []);

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: queryPersister, maxAge: 1000 * 60 * 60 * 24 * 7, buster: "v2" }}
        >
          <NavigationContainer theme={navTheme}>
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
          <ToastHost />
        </PersistQueryClientProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}

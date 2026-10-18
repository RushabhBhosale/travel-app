import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSSO } from "@clerk/clerk-expo";
import { colors } from "../theme";

WebBrowser.maybeCompleteAuthSession();

const useWarmUpBrowser = () => {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

const GoogleSignIn = ({ onError }: { onError: (message: string) => void }) => {
  const [loading, setLoading] = useState(false);
  const { startSSOFlow } = useSSO();
  useWarmUpBrowser();

  const onPress = useCallback(async () => {
    setLoading(true);
    onError("");
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: "travelapp", path: "oauth-callback" });
      const { createdSessionId, setActive, authSessionResult, signIn, signUp } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl,
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      } else if (authSessionResult?.type === "success") {
        onError("Google sign-in couldn't be completed. Please try again or use email.");
      }
    } catch (err: any) {
      onError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [startSSOFlow, onError]);

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className="h-12 w-full flex-row items-center justify-center rounded-2xl border border-slate-200 bg-white active:opacity-70"
    >
      {loading ? (
        <ActivityIndicator color={colors.brand} />
      ) : (
        <View className="flex-row items-center">
          <Ionicons name="logo-google" size={18} color="#EA4335" />
          <Text className="ml-2.5 text-[15px] font-semibold text-slate-800">Continue with Google</Text>
        </View>
      )}
    </Pressable>
  );
};

export default GoogleSignIn;

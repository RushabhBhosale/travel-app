import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useOAuth } from "@clerk/clerk-expo";

const useWarmUpBrowser = () => {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

const GoogleSignIn = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

  useWarmUpBrowser();

  const onGoogleSignInPress = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL("/"),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      } else {
        setError("Google sigin-in incomplete. Please try again");
      }
    } catch (error: any) {
      console.log("Error", error);
      setError(error.errors[0]?.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <View className="w-full">
      {error ? (
        <Text className="text-red-500 mb-3 text-sm">{error}</Text>
      ) : null}

      <TouchableOpacity
        onPress={onGoogleSignInPress}
        className="w-full border border-gray-300 py-3 mt-3 rounded-lg flex-row items-center justify-center
      "
      >
        {loading ? (
          <ActivityIndicator color="#FF5722" />
        ) : (
          <>
            <Image
              source={{ uri: "https://www.google.com/favicon.ico" }}
              className="size-5 mr-2"
            />
            <Text className="text-gray-900 text-base font-semibold">
              Sign In with Google
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default GoogleSignIn;

const styles = StyleSheet.create({});

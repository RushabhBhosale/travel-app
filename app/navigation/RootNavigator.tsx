import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth, useUser } from "@clerk/clerk-expo";
import TabNavigator from "./TabNavigator";
import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";
import NewTripScreen from "../screens/NewTripScreen";
import TripScreen from "../screens/TripScreen";
import AIChatScreen from "../screens/AIChatScreen";
import MapScreen from "../screens/MapScreen";
import DestinationScreen from "../screens/DestinationScreen";
import PhotoCreditsScreen from "../screens/PhotoCreditsScreen";
import { api, setAuthProvider } from "../lib/api";
import { queryClient } from "../lib/queries";
import { colors } from "../theme";
import type { RootStackParams } from "./types";

const Stack = createNativeStackNavigator<RootStackParams>();

/** Gives the API client access to the Clerk session and keeps the user record in sync. */
function useAuthBridge() {
  const { getToken, userId, isSignedIn } = useAuth();
  const { user } = useUser();

  // Registered during render (not in an effect) so the very first requests
  // made by child screens already carry the session.
  setAuthProvider(async () => ({ token: isSignedIn ? await getToken().catch(() => null) : null, userId: userId ?? null }));

  useEffect(() => {
    if (!user) return;
    api
      .syncUser({ email: user.primaryEmailAddress?.emailAddress, name: user.fullName ?? undefined })
      .catch(() => {});
  }, [user?.id]);

  // Don't show one user's cached trips to the next user on this device.
  useEffect(() => {
    if (isSignedIn === false) queryClient.clear();
  }, [isSignedIn]);
}

const RootNavigator = () => {
  const { isSignedIn, isLoaded } = useAuth();
  useAuthBridge();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: colors.bg } }}>
      {isSignedIn ? (
        <>
          <Stack.Screen name="Tabs" component={TabNavigator} />
          <Stack.Screen name="Trip" component={TripScreen} />
          <Stack.Screen name="Destination" component={DestinationScreen} />
          <Stack.Screen name="Map" component={MapScreen} options={{ animation: "fade_from_bottom" }} />
          <Stack.Screen name="AIChat" component={AIChatScreen} />
          <Stack.Screen name="PhotoCredits" component={PhotoCreditsScreen} />
          <Stack.Screen name="NewTrip" component={NewTripScreen} options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        </>
      ) : (
        <>
          <Stack.Screen name="SignIn" component={SignInScreen} options={{ animationTypeForReplace: "pop" }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;

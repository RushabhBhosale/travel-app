import React from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import HomeScreen from "../screens/HomeScreen";
import ExploreScreen from "../screens/ExploreScreen";
import TripsScreen from "../screens/TripsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { colors } from "../theme";
import type { TabParams } from "./types";

const Tab = createBottomTabNavigator<TabParams>();

const ICONS: Record<keyof TabParams, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ["home", "home-outline"],
  Explore: ["compass", "compass-outline"],
  Trips: ["airplane", "airplane-outline"],
  Profile: ["person-circle", "person-circle-outline"],
};

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.brand,
      tabBarInactiveTintColor: colors.subtle,
      tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      tabBarStyle: {
        backgroundColor: "#fff",
        borderTopColor: colors.border,
        ...(Platform.OS === "android" ? { height: 64, paddingBottom: 8, paddingTop: 6 } : {}),
      },
      tabBarIcon: ({ focused, color, size }) => (
        <Ionicons name={ICONS[route.name][focused ? 0 : 1]} size={size - 1} color={color} />
      ),
      freezeOnBlur: true,
    })}
    screenListeners={{ tabPress: () => Haptics.selectionAsync().catch(() => {}) }}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Explore" component={ExploreScreen} />
    <Tab.Screen name="Trips" component={TripsScreen} options={{ title: "My Trips" }} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default TabNavigator;

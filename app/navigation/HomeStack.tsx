import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import NewTripScreen from "../screens/NewTripScreen";
import PlanTripScreen from "../screens/PlanTripScreen";

export type HomeStackParams = {
  HomeMain: undefined;
  NewTrip: undefined;
  PlanTrip: { trip: any };
};

const HomeStack = () => {
  const Stack = createNativeStackNavigator<HomeStackParams>();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="NewTrip" component={NewTripScreen} />
      <Stack.Screen name="PlanTrip" component={PlanTripScreen} />
    </Stack.Navigator>
  );
};

export default HomeStack;

const styles = StyleSheet.create({});

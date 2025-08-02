import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import GuideDetailScreen from "../screens/GuideDetailScreen";
import GuideScreen from "../screens/GuideScreen";

export type Place = {
  id: string;
  name: string;
  image: string;
  description: string;
  attributes: {
    location: string;
    type: string;
    bestTime: string;
    attractions: string[];
  };
};

export type GuideStackParams = {
  GuideMain: undefined;
  GuideDetail: { place: Place };
};

const GuideStack = () => {
  const Stack = createNativeStackNavigator<GuideStackParams>();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GuideMain" component={GuideScreen} />
      <Stack.Screen name="GuideDetail" component={GuideDetailScreen} />
    </Stack.Navigator>
  );
};

export default GuideStack;

const styles = StyleSheet.create({});

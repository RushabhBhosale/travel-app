import { StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";

const SignUpScreens = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigation = useNavigation();
  return (
    <View>
      <Text>SignUpScreens</Text>
    </View>
  );
};

export default SignUpScreens;

const styles = StyleSheet.create({});

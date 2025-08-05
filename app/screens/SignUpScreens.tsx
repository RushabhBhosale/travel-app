import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";

const SignUpScreens = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

      <TextInput
        autoCapitalize="none"
        placeholder="Enter email address"
        onChangeText={setEmail}
        value={email}
        style={styles.input}
      />
      <TextInput
        secureTextEntry
        placeholder="Enter password"
        onChangeText={setPassword}
        value={password}
        style={styles.input}
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>

      <View style={styles.linkContainer}>
        <Text style={styles.linkText}>Already have an account?</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.linkText, { color: "#FF5722" }]}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SignUpScreens;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
  },
  button: {
    backgroundColor: "#FF5722",
    padding: 12,
    borderRadius: 5,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  linkContainer: {
    flexDirection: "row",
    marginTop: 20,
  },
  linkText: {
    fontSize: 16,
  },
  error: {
    color: "red",
    marginBottom: 10,
  },
});

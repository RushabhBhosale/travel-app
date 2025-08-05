import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useState } from "react";

const GoogleSignIn = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <View className="w-full">
      {error ? (
        <Text className="text-red-500 mb-3 text-sm">{error}</Text>
      ) : null}

      <TouchableOpacity
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

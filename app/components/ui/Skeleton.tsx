import React, { useEffect, useRef } from "react";
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

/** Pulsing placeholder shown while content loads. */
const Skeleton = ({ style, className = "" }: { style?: StyleProp<ViewStyle>; className?: string }) => {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <View className={`overflow-hidden rounded-2xl ${className}`} style={style}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity, backgroundColor: "#E2E8F0" }]} />
    </View>
  );
};

export default Skeleton;

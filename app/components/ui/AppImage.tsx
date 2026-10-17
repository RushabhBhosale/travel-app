import React, { memo, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Image, ImageContentFit } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { ImageInput } from "../../lib/images";

type Props = {
  source: ImageInput;
  /** Tried when `source` is missing or fails to load. */
  fallback?: ImageInput;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  /** Dark gradient at the bottom so overlaid text stays readable. */
  scrim?: boolean;
  fallbackIcon?: React.ComponentProps<typeof Ionicons>["name"];
  children?: React.ReactNode;
  priority?: "low" | "normal" | "high";
};

const FALLBACKS: [string, string][] = [
  ["#FFB199", "#FF5A36"],
  ["#93C5FD", "#2563EB"],
  ["#86EFAC", "#16A34A"],
  ["#C4B5FD", "#7C3AED"],
];

/** Cached image with a graceful gradient fallback when there's no photo or it fails to load. */
const AppImage = ({ source, fallback, style, contentFit = "cover", scrim, fallbackIcon = "image-outline", children, priority }: Props) => {
  const [failed, setFailed] = useState(false);
  const chosen = source && !failed ? source : fallback;
  const src = typeof chosen === "string" ? { uri: chosen } : chosen;
  const showFallback = !src || (failed && !fallback);
  const seed = typeof source === "string" ? source.length : 0;

  return (
    <View style={[styles.base, style]}>
      {showFallback ? (
        <LinearGradient colors={FALLBACKS[seed % FALLBACKS.length]} style={[StyleSheet.absoluteFill, styles.center]}>
          <Ionicons name={fallbackIcon} size={28} color="rgba(255,255,255,0.85)" />
        </LinearGradient>
      ) : (
        <Image
          source={src as any}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={180}
          cachePolicy="memory-disk"
          priority={priority}
          onError={() => setFailed(true)}
        />
      )}
      {scrim && (
        <LinearGradient
          colors={["transparent", "rgba(2,6,23,0.25)", "rgba(2,6,23,0.8)"]}
          locations={[0.35, 0.6, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: { overflow: "hidden", backgroundColor: "#E2E8F0" },
  center: { alignItems: "center", justifyContent: "center" },
});

export default memo(AppImage);

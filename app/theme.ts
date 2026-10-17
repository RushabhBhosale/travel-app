import { Platform, ViewStyle } from "react-native";

export const colors = {
  brand: "#FF5A36",
  brandDark: "#EB4523",
  brandSoft: "#FFF5F2",
  ink: "#0F172A",
  text: "#1E293B",
  muted: "#64748B",
  subtle: "#94A3B8",
  border: "#E2E8F0",
  surface: "#FFFFFF",
  bg: "#F8FAFC",
  ai: "#7C3AED",
  aiSoft: "#F5F3FF",
  success: "#16A34A",
  danger: "#DC2626",
  dayColors: ["#FF5A36", "#2563EB", "#16A34A", "#9333EA", "#D97706", "#0891B2", "#DB2777", "#4F46E5"],
};

export const dayColor = (index: number) => colors.dayColors[index % colors.dayColors.length];

export const shadow = (level: 1 | 2 | 3 = 1): ViewStyle =>
  Platform.select({
    ios: {
      shadowColor: colors.ink,
      shadowOpacity: [0.06, 0.1, 0.16][level - 1],
      shadowRadius: [6, 12, 20][level - 1],
      shadowOffset: { width: 0, height: [2, 6, 10][level - 1] },
    },
    default: { elevation: [2, 5, 10][level - 1] },
  }) as ViewStyle;

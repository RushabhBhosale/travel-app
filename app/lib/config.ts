export const APP_NAME = "Wayfare";

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || "https://travel-app-nine-woad.vercel.app"
).replace(/\/$/, "");

export const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY || "";

export const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "pk_test_cmVhZHktZ251LTIzLmNsZXJrLmFjY291bnRzLmRldiQ";

export const USER_AGENT = "TravelPlannerApp/1.0";

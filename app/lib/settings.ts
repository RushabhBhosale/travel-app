import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Settings = { currency: string };

const DEFAULTS: Settings = { currency: "INR" };
const KEY = "wayfare-settings";

let current: Settings = DEFAULTS;
const listeners = new Set<(s: Settings) => void>();

AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (!raw) return;
    current = { ...DEFAULTS, ...JSON.parse(raw) };
    listeners.forEach((l) => l(current));
  })
  .catch(() => {});

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  listeners.forEach((l) => l(current));
  AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => {});
}

/** App-wide preferences persisted on the device. */
export function useSettings() {
  const [settings, setSettings] = useState(current);
  useEffect(() => {
    listeners.add(setSettings);
    setSettings(current);
    return () => {
      listeners.delete(setSettings);
    };
  }, []);
  return settings;
}

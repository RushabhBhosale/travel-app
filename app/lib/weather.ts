import { useQuery } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import type { LatLng } from "./types";

export type DailyWeather = { date: string; code: number; max: number; min: number; rain: number | null };
export type Forecast = { current: { temp: number; code: number }; daily: DailyWeather[] };

/** 16-day forecast from Open-Meteo (free, no key). */
async function fetchForecast({ lat, lng }: LatLng): Promise<Forecast> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    "&current=temperature_2m,weather_code" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&timezone=auto&forecast_days=16";
  const j = await fetch(url).then((r) => {
    if (!r.ok) throw new Error("Weather unavailable");
    return r.json();
  });
  return {
    current: { temp: Math.round(j.current.temperature_2m), code: j.current.weather_code },
    daily: j.daily.time.map((date: string, i: number) => ({
      date,
      code: j.daily.weather_code[i],
      max: Math.round(j.daily.temperature_2m_max[i]),
      min: Math.round(j.daily.temperature_2m_min[i]),
      rain: j.daily.precipitation_probability_max?.[i] ?? null,
    })),
  };
}

export function useForecast(location?: LatLng | null) {
  const valid = !!location && (location.lat !== 0 || location.lng !== 0);
  return useQuery({
    queryKey: ["weather", location?.lat?.toFixed(2), location?.lng?.toFixed(2)],
    queryFn: () => fetchForecast(location!),
    enabled: valid,
    staleTime: 1000 * 60 * 30,
  });
}

type IconName = ComponentProps<typeof Ionicons>["name"];

/** WMO weather code → label and icon. */
export function weatherInfo(code: number): { label: string; icon: IconName; color: string } {
  if (code === 0) return { label: "Clear", icon: "sunny", color: "#F59E0B" };
  if (code <= 2) return { label: "Partly cloudy", icon: "partly-sunny", color: "#F59E0B" };
  if (code === 3) return { label: "Cloudy", icon: "cloudy", color: "#64748B" };
  if (code <= 48) return { label: "Fog", icon: "cloudy", color: "#94A3B8" };
  if (code <= 57) return { label: "Drizzle", icon: "rainy", color: "#3B82F6" };
  if (code <= 67) return { label: "Rain", icon: "rainy", color: "#2563EB" };
  if (code <= 77) return { label: "Snow", icon: "snow", color: "#60A5FA" };
  if (code <= 82) return { label: "Showers", icon: "rainy", color: "#2563EB" };
  if (code <= 86) return { label: "Snow showers", icon: "snow", color: "#60A5FA" };
  return { label: "Thunderstorm", icon: "thunderstorm", color: "#7C3AED" };
}

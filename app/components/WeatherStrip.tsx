import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import Skeleton from "./ui/Skeleton";
import { shadow } from "../theme";
import { useForecast, weatherInfo } from "../lib/weather";
import type { LatLng } from "../lib/types";

type Props = { location?: LatLng | null; startDate?: string; endDate?: string; title?: string };

/**
 * Shows the forecast for the trip dates when they're within the 16-day
 * forecast window, otherwise current conditions and the coming week.
 */
const WeatherStrip = ({ location, startDate, endDate, title = "Weather" }: Props) => {
  const { data, isLoading, isError } = useForecast(location);
  if (!location) return null;

  if (isLoading) return <Skeleton style={{ height: 112 }} className="mb-5" />;
  if (isError || !data) return null;

  const inTrip = data.daily.filter((d) => startDate && endDate && d.date >= startDate && d.date <= endDate);
  const days = inTrip.length ? inTrip : data.daily.slice(0, 7);
  const now = weatherInfo(data.current.code);
  const daysAway = startDate ? dayjs(startDate).diff(dayjs().startOf("day"), "day") : 0;

  return (
    <View className="mb-5 rounded-3xl bg-white p-4" style={shadow(1)}>
      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-[15px] font-bold text-slate-900">{title}</Text>
          <Text className="text-xs text-slate-500">
            {inTrip.length ? "Forecast for your trip" : daysAway > 15 ? `Trip forecast appears ${daysAway - 15} days before you go` : "Next 7 days"}
          </Text>
        </View>
        <View className="flex-row items-center rounded-full bg-slate-50 px-3 py-1.5">
          <Ionicons name={now.icon} size={16} color={now.color} />
          <Text className="ml-1.5 text-sm font-bold text-slate-900">{data.current.temp}°</Text>
          <Text className="ml-1 text-xs text-slate-500">now</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {days.map((d) => {
          const w = weatherInfo(d.code);
          return (
            <View key={d.date} className="mr-2 w-14 items-center rounded-2xl bg-slate-50 py-2.5">
              <Text className="text-[11px] font-semibold text-slate-500">{dayjs(d.date).format("ddd")}</Text>
              <Ionicons name={w.icon} size={20} color={w.color} style={{ marginVertical: 4 }} />
              <Text className="text-[13px] font-bold text-slate-900">{d.max}°</Text>
              <Text className="text-[11px] text-slate-400">{d.min}°</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default WeatherStrip;

import dayjs from "dayjs";
import type { Trip } from "./types";

export const CURRENCIES = [
  { code: "INR", symbol: "₹" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "AED", symbol: "AED " },
  { code: "SGD", symbol: "S$" },
  { code: "JPY", symbol: "¥" },
  { code: "THB", symbol: "฿" },
  { code: "AUD", symbol: "A$" },
] as const;

export function formatMoney(amount: number, currency = "INR") {
  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? `${currency} `;
  const digits = currency === "JPY" ? 0 : Number.isInteger(amount) ? 0 : 2;
  const locale = currency === "INR" ? "en-IN" : "en-US";
  try {
    return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
  } catch {
    return `${symbol}${amount.toFixed(digits)}`;
  }
}

export function formatDateRange(start?: string, end?: string) {
  if (!start) return "Dates not set";
  const s = dayjs(start);
  const e = dayjs(end || start);
  if (s.isSame(e, "day")) return s.format("D MMM YYYY");
  if (s.isSame(e, "month")) return `${s.format("D")} – ${e.format("D MMM YYYY")}`;
  if (s.isSame(e, "year")) return `${s.format("D MMM")} – ${e.format("D MMM YYYY")}`;
  return `${s.format("D MMM YYYY")} – ${e.format("D MMM YYYY")}`;
}

export const tripLength = (t: Pick<Trip, "startDate" | "endDate">) =>
  Math.max(1, dayjs(t.endDate).diff(dayjs(t.startDate), "day") + 1);

export type TripPhase = "upcoming" | "ongoing" | "past";

export function tripStatus(t: Pick<Trip, "startDate" | "endDate">): { phase: TripPhase; label: string } {
  const today = dayjs().startOf("day");
  const start = dayjs(t.startDate).startOf("day");
  const end = dayjs(t.endDate).startOf("day");
  if (today.isBefore(start)) {
    const days = start.diff(today, "day");
    return { phase: "upcoming", label: days === 1 ? "Tomorrow" : `In ${days} days` };
  }
  if (today.isAfter(end)) return { phase: "past", label: "Completed" };
  return { phase: "ongoing", label: `Day ${today.diff(start, "day") + 1} of ${tripLength(t)}` };
}

export function tripDays(t: Pick<Trip, "startDate" | "endDate">) {
  const days: { value: string; label: string; short: string; index: number }[] = [];
  const end = dayjs(t.endDate);
  for (let d = dayjs(t.startDate), i = 0; !d.isAfter(end, "day") && i < 60; d = d.add(1, "day"), i++) {
    days.push({ value: d.format("YYYY-MM-DD"), label: d.format("ddd, D MMM"), short: d.format("D MMM"), index: i });
  }
  return days;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Plain-text summary of a trip, for sharing. */
export function tripToText(trip: Trip) {
  const lines = [`✈️ ${trip.tripName}`, formatDateRange(trip.startDate, trip.endDate), ""];
  for (const day of tripDays(trip)) {
    const entry = trip.itinerary.find((d) => d.date === day.value);
    if (!entry?.activities.length) continue;
    lines.push(`Day ${day.index + 1} · ${day.label}${entry.title ? ` · ${entry.title}` : ""}`);
    entry.activities.forEach((a) => lines.push(`  • ${a.name}`));
    lines.push("");
  }
  if (trip.placesToVisit.length) {
    lines.push("Places to visit:");
    trip.placesToVisit.forEach((p) => lines.push(`  • ${p.name}`));
  }
  return lines.join("\n").trim();
}

export const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

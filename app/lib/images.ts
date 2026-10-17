import type { ImageSourcePropType } from "react-native";
import { destinationById, matchDestination } from "../data/destinations";
import type { Trip } from "./types";

export type ImageInput = ImageSourcePropType | string | null | undefined;

/** Trip covers can be a URL or "asset:<destination id>" for bundled photos. */
export function tripCover(trip: Pick<Trip, "background" | "tripName">): ImageInput {
  const bg = trip.background;
  if (bg?.startsWith("asset:")) return destinationById(bg.slice(6))?.image;
  if (bg && !bg.includes("via.placeholder.com")) return bg;
  return matchDestination(trip.tripName)?.image;
}

/** Shown if a stored cover URL fails to load (e.g. an expired Google photo). */
export const tripCoverFallback = (trip: Pick<Trip, "tripName">): ImageInput => matchDestination(trip.tripName)?.image;

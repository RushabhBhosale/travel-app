import { GOOGLE_API_KEY, USER_AGENT } from "./config";
import type { LatLng, PlaceInput } from "./types";

/*
 * Place search uses Google when the key works and falls back to Photon
 * (OpenStreetMap, free, no key) when it doesn't, e.g. billing disabled.
 */

export type PlaceSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  source: "google" | "osm";
  placeId?: string;
  location?: LatLng;
  type?: string;
};

let googleDownUntil = 0;
const googleAvailable = () => Boolean(GOOGLE_API_KEY) && Date.now() > googleDownUntil;

async function googleAutocomplete(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
    query
  )}&key=${GOOGLE_API_KEY}&language=en`;
  const json = await fetch(url, { signal }).then((r) => r.json());
  if (json.status === "REQUEST_DENIED" || json.status === "OVER_QUERY_LIMIT") {
    googleDownUntil = Date.now() + 10 * 60_000;
    throw new Error("google-unavailable");
  }
  return (json.predictions || []).map((p: any) => ({
    id: p.place_id,
    placeId: p.place_id,
    title: p.structured_formatting?.main_text || p.description,
    subtitle: p.structured_formatting?.secondary_text || "",
    source: "google" as const,
    type: p.types?.[0],
  }));
}

async function photonSearch(query: string, signal?: AbortSignal, near?: LatLng): Promise<PlaceSuggestion[]> {
  const bias = near ? `&lat=${near.lat}&lon=${near.lng}` : "";
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8&lang=en${bias}`;
  const json = await fetch(url, { signal, headers: { "User-Agent": USER_AGENT } }).then((r) => r.json());
  const seen = new Set<string>();
  return (json.features || [])
    .map((f: any) => {
      const p = f.properties || {};
      const [lng, lat] = f.geometry?.coordinates || [0, 0];
      const parts = [p.city || p.county, p.state, p.country].filter(
        (v: string | undefined, i: number, a: (string | undefined)[]) => v && v !== p.name && a.indexOf(v) === i
      );
      return {
        id: `${p.osm_type}${p.osm_id}`,
        title: p.name || p.street || parts[0] || query,
        subtitle: parts.join(", "),
        source: "osm" as const,
        location: { lat, lng },
        type: p.osm_value,
      };
    })
    .filter((s: PlaceSuggestion) => {
      const key = `${s.title}|${s.subtitle}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export async function searchPlaces(query: string, signal?: AbortSignal, near?: LatLng) {
  const q = query.trim();
  if (q.length < 2) return [];
  if (googleAvailable()) {
    try {
      return await googleAutocomplete(q, signal);
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
    }
  }
  return photonSearch(q, signal, near);
}

/** API payload for adding a chosen suggestion to a trip. */
export function suggestionToInput(s: PlaceSuggestion): PlaceInput {
  if (s.source === "google" && s.placeId) return { placeId: s.placeId };
  return {
    placeData: {
      name: s.title,
      formatted_address: [s.title, s.subtitle].filter(Boolean).join(", "),
      geometry: s.location ? { location: s.location } : undefined,
      types: s.type ? [s.type] : [],
    },
  };
}

/** Coordinates for a suggestion, looking them up when the source didn't include them. */
export async function locateSuggestion(s: PlaceSuggestion): Promise<LatLng | undefined> {
  if (s.location) return s.location;
  if (s.placeId && googleAvailable()) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${s.placeId}&fields=geometry&key=${GOOGLE_API_KEY}`;
      const json = await fetch(url).then((r) => r.json());
      const loc = json.result?.geometry?.location;
      if (loc) return { lat: loc.lat, lng: loc.lng };
    } catch {}
  }
  return geocode([s.title, s.subtitle].filter(Boolean).join(", "));
}

export async function geocode(query: string): Promise<LatLng | undefined> {
  try {
    const [hit] = await photonSearch(query);
    return hit?.location;
  } catch {
    return undefined;
  }
}

export const directionsUrl = (loc: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`;

export const mapsSearchUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

import axios from "axios";

/*
 * Place data comes from Google Places when the key works. When Google is
 * unavailable (no key, billing disabled, quota hit) we fall back to free,
 * keyless sources: Photon (OpenStreetMap) for coordinates and addresses and
 * Wikipedia for descriptions and photos.
 */

const API_KEY = process.env.GOOGLE_API_KEY;
const USER_AGENT = "TravelPlannerApp/1.0 (+https://github.com)";
const http = axios.create({ timeout: 10000, headers: { "User-Agent": USER_AGENT } });

let googleDownUntil = 0;
const googleAvailable = () => Boolean(API_KEY) && Date.now() > googleDownUntil;

class GoogleUnavailable extends Error {}

const DETAIL_FIELDS = [
  "place_id",
  "name",
  "formatted_address",
  "photos",
  "opening_hours",
  "formatted_phone_number",
  "website",
  "geometry",
  "types",
  "reviews",
  "rating",
  "editorial_summary",
].join(",");

async function google(path, params) {
  if (!googleAvailable()) throw new GoogleUnavailable("Google Places is unavailable");
  const { data } = await http.get(`https://maps.googleapis.com/maps/api/place/${path}/json`, {
    params: { ...params, key: API_KEY },
  });
  if (data.status === "REQUEST_DENIED" || data.status === "OVER_QUERY_LIMIT") {
    console.warn(`[places] Google ${data.status}: ${data.error_message || ""} (using free fallback for 10 min)`);
    googleDownUntil = Date.now() + 10 * 60_000;
    throw new GoogleUnavailable(data.error_message || data.status);
  }
  return data;
}

export const photoUrl = (ref, width = 800) =>
  `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photoreference=${ref}&key=${API_KEY}`;

const truncate = (text = "", max = 220) =>
  text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

const latLng = (p) => ({
  lat: Number(p?.lat ?? p?.latitude) || 0,
  lng: Number(p?.lng ?? p?.lon ?? p?.longitude) || 0,
});

const emptyViewport = () => ({ northeast: latLng(), southwest: latLng() });

/** Maps a Google Place Details result to the shape stored on trips. */
export function normalizePlace(d, fallback = {}) {
  const description =
    d.editorial_summary?.overview ||
    fallback.description ||
    d.reviews?.[0]?.text ||
    (d.formatted_address ? `Located at ${d.formatted_address}.` : "");

  return {
    googlePlaceId: d.place_id || fallback.googlePlaceId,
    name: d.name || fallback.name || "Unknown place",
    phoneNumber: d.formatted_phone_number || "",
    website: d.website || "",
    openingHours: d.opening_hours?.weekday_text || [],
    photos: (d.photos || []).slice(0, 6).map((p) => photoUrl(p.photo_reference)),
    reviews: (d.reviews || []).slice(0, 5).map((r) => ({
      authorName: r.author_name || "Anonymous",
      rating: r.rating || 0,
      text: r.text || "",
    })),
    rating: d.rating,
    types: (d.types || []).filter((t) => t !== "point_of_interest" && t !== "establishment"),
    formatted_address: d.formatted_address || fallback.address || "",
    briefDescription: truncate(description),
    geometry: {
      location: latLng(d.geometry?.location),
      viewport: {
        northeast: latLng(d.geometry?.viewport?.northeast),
        southwest: latLng(d.geometry?.viewport?.southwest),
      },
    },
  };
}

export async function placeDetails(placeId) {
  const data = await google("details", { place_id: placeId, fields: DETAIL_FIELDS });
  if (data.status !== "OK" || !data.result) throw new Error(`Google Places error: ${data.status}`);
  return data.result;
}

async function googleFindPlaceId(query) {
  const data = await google("findplacefromtext", {
    input: query,
    inputtype: "textquery",
    fields: "place_id",
  });
  return data.candidates?.[0]?.place_id || null;
}

/** Free geocoding through Photon (OpenStreetMap). */
export async function photonSearch(query, limit = 1) {
  const { data } = await http.get("https://photon.komoot.io/api/", {
    params: { q: query, limit, lang: "en" },
  });
  return (data.features || []).map((f) => {
    const p = f.properties || {};
    const [lng, lat] = f.geometry?.coordinates || [0, 0];
    const address = [p.street, p.district || p.locality, p.city, p.state, p.country]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(", ");
    return { name: p.name, address, lat, lng, type: p.osm_value };
  });
}

/** Description + photo from Wikipedia for a place name. */
export async function wikipediaLookup(query) {
  try {
    const { data } = await http.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        format: "json",
        formatversion: 2,
        generator: "search",
        gsrsearch: query,
        gsrlimit: 1,
        prop: "pageimages|extracts|coordinates",
        exintro: 1,
        explaintext: 1,
        exsentences: 3,
        piprop: "thumbnail",
        pithumbsize: 500,
        redirects: 1,
      },
    });
    const page = data?.query?.pages?.[0];
    if (!page) return null;
    return {
      title: page.title,
      description: page.extract || "",
      photo: page.thumbnail?.source || null,
      coords: page.coordinates?.[0] ? latLng(page.coordinates[0]) : null,
    };
  } catch (err) {
    console.warn("[places] Wikipedia lookup failed", err.message);
    return null;
  }
}

/** Fills in missing photo, description and coordinates on a stored place. */
export async function enrichPlace(place, context = "") {
  const needsPhoto = !place.photos?.length;
  const needsText = !place.briefDescription;
  const loc = place.geometry?.location;
  const needsCoords = !loc?.lat && !loc?.lng;
  if (!needsPhoto && !needsText && !needsCoords) return place;

  const query = [place.name, context].filter(Boolean).join(" ");
  const [wiki, geo] = await Promise.all([
    needsPhoto || needsText ? wikipediaLookup(query) : null,
    needsCoords ? photonSearch([place.name, place.formatted_address || context].filter(Boolean).join(", ")).catch(() => []) : [],
  ]);

  if (wiki?.photo && needsPhoto) place.photos = [wiki.photo];
  if (wiki?.description && needsText) place.briefDescription = truncate(wiki.description);
  if (needsCoords) {
    const hit = geo[0];
    const coords = hit ? { lat: hit.lat, lng: hit.lng } : wiki?.coords;
    if (coords) place.geometry = { location: latLng(coords), viewport: emptyViewport() };
    if (hit?.address && !place.formatted_address) place.formatted_address = hit.address;
  }
  return place;
}

/** Looks a free-text place up (Google first, then free sources). */
export async function resolvePlace({ name, address, description }, context = "") {
  try {
    const id = await googleFindPlaceId([name, address].filter(Boolean).join(", "));
    if (id) return normalizePlace(await placeDetails(id), { name, address, description });
  } catch (err) {
    if (!(err instanceof GoogleUnavailable)) {
      console.warn(`[places] Google lookup failed for "${name}":`, err.message);
    }
  }
  const base = normalizePlace({}, { name, address, description });
  return enrichPlace(base, context);
}

/** Sanitises a client-supplied place object before it is stored. */
export function sanitizePlace(p = {}) {
  return {
    googlePlaceId: p.googlePlaceId || p.place_id || undefined,
    name: String(p.name || "Unknown place").slice(0, 200),
    phoneNumber: p.phoneNumber || "",
    website: p.website || "",
    openingHours: Array.isArray(p.openingHours) ? p.openingHours.slice(0, 7) : [],
    photos: Array.isArray(p.photos) ? p.photos.filter((u) => typeof u === "string").slice(0, 6) : [],
    reviews: Array.isArray(p.reviews) ? p.reviews.slice(0, 5) : [],
    rating: typeof p.rating === "number" ? p.rating : undefined,
    types: Array.isArray(p.types) ? p.types.slice(0, 10) : [],
    formatted_address: p.formatted_address || p.address || "",
    briefDescription: truncate(String(p.briefDescription || p.description || "")),
    geometry: {
      location: latLng(p.geometry?.location),
      viewport: {
        northeast: latLng(p.geometry?.viewport?.northeast),
        southwest: latLng(p.geometry?.viewport?.southwest),
      },
    },
  };
}

/** Runs async work over items with bounded concurrency. */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

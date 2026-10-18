# Wayfare – travel planner

Expo (React Native) app with a Next.js API service backed by MongoDB.

- **Trips:** day-by-day itinerary, saved places, notes, packing list and budget/expenses, all stored per trip
- **AI:** chat assistant with trip context, one-tap itinerary planning, and place suggestions by interest (OpenRouter)
- **Explore:** 28 curated destination guides plus worldwide search, Wikipedia summaries and live weather (Open-Meteo)
- **Map:** places and stops coloured by day, with directions
- **Offline-friendly:** cached data so screens open instantly while the API wakes up

## Run the app

```bash
cp .env.example .env          # fill in the values
npm install
npx expo run:ios               # or: npx expo run:android  (native rebuild needed after adding native modules)
```

`.env` (only `EXPO_PUBLIC_*` values, which are bundled into the app):

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth |
| `EXPO_PUBLIC_API_URL` | API base URL, e.g. `https://travel-app-b0mb.onrender.com` or `http://<your-LAN-IP>:3000` |
| `EXPO_PUBLIC_GOOGLE_API_KEY` | Optional. Google Places search; falls back to OpenStreetMap when unavailable |

## Run the API

```bash
cd api
cp .env.example .env           # fill in the values
npm install
npm run dev
```

The API runs on `http://localhost:3000` by default. Set the same variables in your host (Render → Environment) for production:
`MONGO_URI`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `GOOGLE_API_KEY`, `OPENROUTER_API_KEY`, `CLERK_SECRET_KEY` (recommended: verifies sessions), optional `OPENROUTER_MODELS`.

## Data sources

- Places: Google Places when the key has billing enabled, otherwise [Photon](https://photon.komoot.io) (OpenStreetMap) + Wikipedia
- Weather: [Open-Meteo](https://open-meteo.com)
- Destination photos: Wikimedia Commons (credits in the app under Profile → Photo credits)

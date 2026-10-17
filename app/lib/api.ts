import axios, { AxiosError } from "axios";
import { API_URL } from "./config";
import type { ChatMessage, Place, PlaceInput, Trip } from "./types";

type AuthProvider = () => Promise<{ token: string | null; userId: string | null }>;

let authProvider: AuthProvider = async () => ({ token: null, userId: null });

/** Registered once Clerk is ready so every request carries the session. */
export const setAuthProvider = (fn: AuthProvider) => {
  authProvider = fn;
};

export const http = axios.create({ baseURL: API_URL, timeout: 30000 });

http.interceptors.request.use(async (config) => {
  const { token, userId } = await authProvider();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (userId) config.headers["x-clerk-user-id"] = userId;
  return config;
});

export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<{ error?: string; message?: string }>;
    if (e.response?.data?.error) return e.response.data.error;
    if (e.code === "ECONNABORTED") return "The server is taking too long. Please try again.";
    if (!e.response) return "No connection to the server. Check your internet.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** Wakes the API early; free hosting sleeps when idle. */
export const warmUp = () => http.get("/health", { timeout: 60000 }).catch(() => {});

const tripOf = (r: { data: { trip: Trip } }) => r.data.trip;
const base = (id: string) => `/api/trips/${id}`;

export const api = {
  syncUser: (body: { email?: string; name?: string }) => http.post("/api/users/sync", body),

  listTrips: () => http.get<{ trips: Trip[] }>("/api/trips").then((r) => r.data.trips),
  getTrip: (id: string) => http.get(base(id)).then(tripOf),
  createTrip: (body: {
    tripName: string;
    startDate: string;
    endDate: string;
    background?: string;
    location?: { lat: number; lng: number };
    budget?: number;
    currency?: string;
    userData?: { email?: string; name?: string };
  }) => http.post("/api/trips", body).then(tripOf),
  updateTrip: (id: string, patch: Partial<Pick<Trip, "tripName" | "startDate" | "endDate" | "notes" | "budget" | "currency">>) =>
    http.patch(base(id), patch).then(tripOf),
  deleteTrip: (id: string) => http.delete(base(id)),

  addPlace: (id: string, input: PlaceInput) => http.post(`${base(id)}/places`, input).then(tripOf),
  removePlace: (id: string, placeId: string) => http.delete(`${base(id)}/places/${placeId}`).then(tripOf),

  addActivity: (id: string, date: string, input: PlaceInput) =>
    http.post(`${base(id)}/itinerary`, { ...input, date }).then(tripOf),
  setDayTitle: (id: string, date: string, title: string) =>
    http.patch(`${base(id)}/itinerary/${date}`, { title }).then(tripOf),
  removeActivity: (id: string, date: string, activityId: string) =>
    http.delete(`${base(id)}/itinerary/${date}/activities/${activityId}`).then(tripOf),
  aiPlan: (id: string, body: { date?: string; perDay?: number } = {}) =>
    http.post(`${base(id)}/ai-plan`, body, { timeout: 120000 }).then(tripOf),

  addExpense: (id: string, body: Record<string, unknown>) => http.post(`${base(id)}/expenses`, body).then(tripOf),
  updateExpense: (id: string, expenseId: string, body: Record<string, unknown>) =>
    http.put(`${base(id)}/expenses/${expenseId}`, body).then(tripOf),
  removeExpense: (id: string, expenseId: string) => http.delete(`${base(id)}/expenses/${expenseId}`).then(tripOf),

  addChecklist: (id: string, items: string[]) => http.post(`${base(id)}/checklist`, { items }).then(tripOf),
  toggleChecklist: (id: string, itemId: string, done: boolean) =>
    http.patch(`${base(id)}/checklist/${itemId}`, { done }).then(tripOf),
  removeChecklist: (id: string, itemId: string) => http.delete(`${base(id)}/checklist/${itemId}`).then(tripOf),

  chat: (messages: ChatMessage[], context: Record<string, unknown>) =>
    http
      .post<{ reply: string }>(
        "/api/ai/chat",
        { messages: messages.filter((m) => !m.error).map(({ role, content }) => ({ role, content })), context },
        { timeout: 90000 }
      )
      .then((r) => r.data.reply),
  suggestions: (destination: string, exclude: string[] = [], interest?: string) =>
    http
      .post<{ places: Place[] }>("/api/ai/suggestions", { destination, exclude, interest }, { timeout: 120000 })
      .then((r) => r.data.places),

  sendEmail: (subject: string, message: string) =>
    http.post<{ message: string }>("/api/send-email", { subject, message }).then((r) => r.data.message),
};

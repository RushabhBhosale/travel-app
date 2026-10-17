import "dotenv/config";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dayjs from "dayjs";
import User from "./models/user.js";
import Trip from "./models/trip.js";
import { requireAuth, upsertUser } from "./lib/auth.js";
import {
  enrichPlace,
  mapLimit,
  normalizePlace,
  placeDetails,
  resolvePlace,
  sanitizePlace,
} from "./lib/places.js";
import { AIError, complete, parseJson, rateLimit, travelSystemPrompt } from "./lib/ai.js";

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error("MONGO_URI is not set. Copy api/.env.example to api/.env and fill it in.");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`));
  next();
});

const transporter =
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      })
    : null;

/* ----------------------------- helpers ----------------------------- */

const isId = (id) => mongoose.isValidObjectId(id);

const populateTrip = (query) => query.populate("host travelers", "name email clerkUserId");

/** Loads a trip the signed-in user can access, or sends 404 and returns null. */
async function loadTrip(req, res, { hostOnly = false } = {}) {
  const { tripId } = req.params;
  if (!isId(tripId)) {
    res.status(404).json({ error: "Trip not found" });
    return null;
  }
  const user = await User.findOne({ clerkUserId: req.clerkUserId });
  const trip = user ? await Trip.findById(tripId) : null;
  const uid = user?._id?.toString();
  const allowed =
    trip &&
    (trip.host?.toString() === uid ||
      (!hostOnly && trip.travelers.some((t) => t.toString() === uid)));
  if (!allowed) {
    res.status(404).json({ error: "Trip not found" });
    return null;
  }
  return trip;
}

async function sendTrip(res, tripId, status = 200) {
  const trip = await populateTrip(Trip.findById(tripId));
  res.status(status).json({ trip });
}

function tripDates(trip) {
  const days = [];
  const end = dayjs(trip.endDate);
  for (let d = dayjs(trip.startDate); !d.isAfter(end, "day") && days.length < 60; d = d.add(1, "day")) {
    days.push(d.format("YYYY-MM-DD"));
  }
  return days;
}

/** Appends activities to the itinerary day for `date`, creating the day if needed. */
function pushActivities(trip, date, activities) {
  let day = trip.itinerary.find((d) => d.date === date);
  if (!day) {
    trip.itinerary.push({ date, activities: [] });
    day = trip.itinerary[trip.itinerary.length - 1];
  }
  day.activities.push(...activities);
  trip.itinerary.sort((a, b) => a.date.localeCompare(b.date));
}

async function placeFromBody(body, context) {
  if (body.placeData) return enrichPlace(sanitizePlace(body.placeData), context);
  if (body.placeId) return normalizePlace(await placeDetails(body.placeId));
  return null;
}

/* ------------------------------ routes ----------------------------- */

app.get("/", (_req, res) => res.send("Trip Planner API"));
app.get("/health", (_req, res) =>
  res.json({ ok: true, db: mongoose.connection.readyState === 1 })
);

app.use("/api", requireAuth);

// Users
app.post("/api/users/sync", async (req, res) => {
  const { email, name } = req.body || {};
  const user = await upsertUser(req.clerkUserId, { email, name });
  if (!user) return res.status(400).json({ error: "Email is required" });
  res.json({ user });
});

// Trips
app.get("/api/trips", async (req, res) => {
  const user = await User.findOne({ clerkUserId: req.clerkUserId });
  if (!user) return res.json({ trips: [] });
  const trips = await populateTrip(
    Trip.find({ $or: [{ host: user._id }, { travelers: user._id }] }).sort({ startDate: 1 })
  );
  res.json({ trips });
});

app.post("/api/trips", async (req, res) => {
  const { tripName, startDate, endDate, background, location, userData = {} } = req.body;

  if (!tripName?.trim() || !startDate || !endDate) {
    return res.status(400).json({ error: "Destination and dates are required" });
  }
  if (dayjs(endDate).isBefore(dayjs(startDate), "day")) {
    return res.status(400).json({ error: "End date must be after the start date" });
  }

  const user = await upsertUser(req.clerkUserId, userData);
  if (!user) return res.status(400).json({ error: "User email is required" });

  const trip = await Trip.create({
    tripName: tripName.trim(),
    startDate,
    endDate,
    startDay: dayjs(startDate).format("dddd"),
    endDay: dayjs(endDate).format("dddd"),
    background: background || "",
    location: location && { lat: Number(location.lat), lng: Number(location.lng) },
    budget: Number(req.body.budget) || 0,
    currency: req.body.currency || "INR",
    host: user._id,
    travelers: [user._id],
  });

  await sendTrip(res, trip._id, 201);
});

app.get("/api/trips/:tripId", async (req, res) => {
  const trip = await loadTrip(req, res);
  if (trip) await sendTrip(res, trip._id);
});

app.patch("/api/trips/:tripId", async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  const { tripName, startDate, endDate, notes, budget, currency } = req.body;

  if (tripName !== undefined) trip.tripName = String(tripName).trim() || trip.tripName;
  if (notes !== undefined) trip.notes = String(notes).slice(0, 10000);
  if (budget !== undefined) trip.budget = Math.max(0, Number(budget) || 0);
  if (currency !== undefined) trip.currency = String(currency).slice(0, 5);
  if (startDate && endDate) {
    if (dayjs(endDate).isBefore(dayjs(startDate), "day")) {
      return res.status(400).json({ error: "End date must be after the start date" });
    }
    trip.startDate = startDate;
    trip.endDate = endDate;
    trip.startDay = dayjs(startDate).format("dddd");
    trip.endDay = dayjs(endDate).format("dddd");
  }
  await trip.save();
  await sendTrip(res, trip._id);
});

app.delete("/api/trips/:tripId", async (req, res) => {
  const trip = await loadTrip(req, res, { hostOnly: true });
  if (!trip) return;
  await trip.deleteOne();
  res.json({ ok: true });
});

// Saved places
app.post("/api/trips/:tripId/places", async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  const place = await placeFromBody(req.body, trip.tripName);
  if (!place) return res.status(400).json({ error: "A place is required" });

  const duplicate =
    place.googlePlaceId && trip.placesToVisit.some((p) => p.googlePlaceId === place.googlePlaceId);
  if (duplicate) return res.status(409).json({ error: `${place.name} is already in your places` });

  trip.placesToVisit.push(place);
  await trip.save();
  await sendTrip(res, trip._id);
});

app.delete("/api/trips/:tripId/places/:placeId", async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  trip.placesToVisit.pull({ _id: req.params.placeId });
  await trip.save();
  await sendTrip(res, trip._id);
});

// Itinerary
app.post("/api/trips/:tripId/itinerary", async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: "Pick a day for this place" });
  const place = await placeFromBody(req.body, trip.tripName);
  if (!place) return res.status(400).json({ error: "A place is required" });

  pushActivities(trip, date, [place]);
  await trip.save();
  await sendTrip(res, trip._id);
});

app.patch("/api/trips/:tripId/itinerary/:date", async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  const day = trip.itinerary.find((d) => d.date === req.params.date);
  if (!day) {
    trip.itinerary.push({ date: req.params.date, title: req.body.title, activities: [] });
    trip.itinerary.sort((a, b) => a.date.localeCompare(b.date));
  } else {
    day.title = String(req.body.title ?? "").slice(0, 120);
  }
  await trip.save();
  await sendTrip(res, trip._id);
});

app.delete("/api/trips/:tripId/itinerary/:date/activities/:activityId", async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  const day = trip.itinerary.find((d) => d.date === req.params.date);
  if (day) {
    day.activities.pull({ _id: req.params.activityId });
    await trip.save();
  }
  await sendTrip(res, trip._id);
});

// Expenses
const expenseFromBody = (b) => ({
  description: String(b.description || "").trim().slice(0, 200),
  category: String(b.category || "Miscellaneous"),
  price: Math.max(0, Number(b.price ?? b.amount) || 0),
  paidBy: String(b.paidBy || "").slice(0, 80),
  splitBy: String(b.splitBy || b.splitOption || "Don't split"),
  date: b.date || dayjs().format("YYYY-MM-DD"),
});

app.post("/api/trips/:tripId/expenses", async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  const expense = expenseFromBody(req.body);
  if (!expense.description || !expense.price) {
    return res.status(400).json({ error: "Add a description and an amount" });
  }
  trip.expenses.push(expense);
  await trip.save();
  await sendTrip(res, trip._id);
});

app.put("/api/trips/:tripId/expenses/:expenseId", async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  const expense = trip.expenses.id(req.params.expenseId);
  if (!expense) return res.status(404).json({ error: "Expense not found" });
  const next = expenseFromBody({ ...expense.toObject(), ...req.body });
  if (!next.description || !next.price) {
    return res.status(400).json({ error: "Add a description and an amount" });
  }
  expense.set(next);
  await trip.save();
  await sendTrip(res, trip._id);
});

app.delete("/api/trips/:tripId/expenses/:expenseId", async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  trip.expenses.pull({ _id: req.params.expenseId });
  await trip.save();
  await sendTrip(res, trip._id);
});

// Packing checklist
app.post("/api/trips/:tripId/checklist", async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  const items = (Array.isArray(req.body.items) ? req.body.items : [req.body.text])
    .map((t) => String(t || "").trim().slice(0, 120))
    .filter(Boolean);
  if (!items.length) return res.status(400).json({ error: "Item text is required" });
  trip.checklist.push(...items.map((text) => ({ text })));
  await trip.save();
  await sendTrip(res, trip._id);
});

app.patch("/api/trips/:tripId/checklist/:itemId", async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  const item = trip.checklist.id(req.params.itemId);
  if (!item) return res.status(404).json({ error: "Item not found" });
  if (req.body.done !== undefined) item.done = Boolean(req.body.done);
  if (req.body.text) item.text = String(req.body.text).slice(0, 120);
  await trip.save();
  await sendTrip(res, trip._id);
});

app.delete("/api/trips/:tripId/checklist/:itemId", async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  trip.checklist.pull({ _id: req.params.itemId });
  await trip.save();
  await sendTrip(res, trip._id);
});

// AI
const aiLimit = rateLimit(20, 60_000);

app.post("/api/ai/chat", aiLimit, async (req, res) => {
  const history = Array.isArray(req.body.messages) ? req.body.messages : [];
  const messages = history
    .filter((m) => ["user", "assistant"].includes(m?.role) && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "Ask a question first" });
  }
  const reply = await complete([
    { role: "system", content: travelSystemPrompt(req.body.context) },
    ...messages,
  ]);
  res.json({ reply });
});

app.post("/api/ai/suggestions", aiLimit, async (req, res) => {
  const destination = String(req.body.destination || "").trim();
  if (!destination) return res.status(400).json({ error: "Destination is required" });
  const exclude = (req.body.exclude || []).slice(0, 30).join(", ");
  const interest = req.body.interest ? ` with a focus on ${req.body.interest}` : "";

  const text = await complete(
    [
      {
        role: "system",
        content:
          'Reply with only a JSON array, no prose. Each item: {"name": string, "address": string, "description": string (max 40 words)}.',
      },
      {
        role: "user",
        content: `List 8 must-visit places in ${destination}${interest}.${
          exclude ? ` Do not include: ${exclude}.` : ""
        }`,
      },
    ],
    { maxTokens: 3000, temperature: 0.5 }
  );

  const items = parseJson(text);
  if (!Array.isArray(items)) throw new AIError("Unexpected AI response, please retry");
  const places = await mapLimit(
    items.filter((p) => p?.name).slice(0, 8),
    4,
    (p) => resolvePlace({ ...p, address: p.address || destination }, destination)
  );
  res.json({ places });
});

app.post("/api/trips/:tripId/ai-plan", aiLimit, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;

  const dates = tripDates(trip);
  const targetDates = req.body.date ? [req.body.date] : dates.slice(0, 10);
  const perDay = Math.min(Math.max(Number(req.body.perDay) || 3, 1), 5);
  const existing = [
    ...trip.placesToVisit.map((p) => p.name),
    ...trip.itinerary.flatMap((d) => d.activities.map((a) => a.name)),
  ];

  const text = await complete(
    [
      {
        role: "system",
        content:
          'Reply with only a JSON array, no prose. Each item: {"day": number, "title": string (max 5 words), "places": [{"name": string, "address": string, "description": string (max 30 words)}]}. Group places that are near each other on the same day and order them in a sensible route.',
      },
      {
        role: "user",
        content: `Plan ${targetDates.length} day(s) in ${trip.tripName} with ${perDay} places per day.${
          existing.length ? ` Avoid these already planned places: ${existing.slice(0, 30).join(", ")}.` : ""
        }`,
      },
    ],
    { maxTokens: 6000, temperature: 0.5 }
  );

  const plan = parseJson(text);
  if (!Array.isArray(plan)) throw new AIError("Unexpected AI response, please retry");

  const days = plan.slice(0, targetDates.length);
  const resolved = await mapLimit(days, 2, async (day) => ({
    title: String(day.title || "").slice(0, 60),
    places: await mapLimit((day.places || []).slice(0, perDay), 3, (p) =>
      resolvePlace({ ...p, address: p.address || trip.tripName }, trip.tripName)
    ),
  }));

  // Reload in case the trip changed while the AI was thinking.
  const fresh = await Trip.findById(trip._id);
  resolved.forEach((day, i) => {
    const date = targetDates[i];
    if (!date || !day.places.length) return;
    pushActivities(fresh, date, day.places);
    const entry = fresh.itinerary.find((d) => d.date === date);
    if (entry && !entry.title && day.title) entry.title = day.title;
  });
  await fresh.save();
  await sendTrip(res, fresh._id);
});

// Email an AI answer or itinerary to the signed-in user (never to arbitrary addresses).
app.post("/api/send-email", async (req, res) => {
  if (!transporter) return res.status(503).json({ error: "Email is not configured on the server" });
  const { subject, message } = req.body;
  if (!subject || !message) return res.status(400).json({ error: "Subject and message are required" });

  const user =
    (await User.findOne({ clerkUserId: req.clerkUserId })) ||
    (await upsertUser(req.clerkUserId, req.body.userData));
  if (!user?.email) return res.status(400).json({ error: "We couldn't find your email address" });

  await transporter.sendMail({
    from: `"Trip Planner" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: String(subject).slice(0, 200),
    text: String(message).slice(0, 20000),
  });
  res.json({ message: `Sent to ${user.email}` });
});

/* --------------------------- error handling -------------------------- */

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Express 5 forwards rejected promises from async handlers here.
app.use((err, _req, res, _next) => {
  if (err instanceof AIError) return res.status(502).json({ error: err.message });
  if (err?.name === "ValidationError") return res.status(400).json({ error: err.message });
  if (err?.name === "CastError") return res.status(404).json({ error: "Not found" });
  console.error("[api] Unhandled error", err);
  const googleDown = err?.constructor?.name === "GoogleUnavailable";
  res
    .status(googleDown ? 503 : 500)
    .json({ error: googleDown ? "Place lookup is unavailable right now" : "Something went wrong" });
});

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(port, () => console.log(`API listening on port ${port}`));
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB", err);
    process.exit(1);
  });

export default app;

import axios from "axios";

const API_KEY = process.env.OPENROUTER_API_KEY?.trim().replace(/^["']|["']$/g, "") || undefined;
// Free OpenRouter models come and go; OpenRouter tries these in order.
const MODELS = (
  process.env.OPENROUTER_MODELS ||
  "google/gemma-4-31b-it:free,nvidia/nemotron-3-super-120b-a12b:free,google/gemma-4-26b-a4b-it:free"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const http = axios.create({
  baseURL: "https://openrouter.ai/api/v1",
  timeout: 60000,
});

export class AIError extends Error {}

export async function complete(messages, { maxTokens = 1200, temperature = 0.7 } = {}) {
  if (!API_KEY) throw new AIError("The AI assistant is not configured on the server");

  try {
    const { data } = await http.post(
      "/chat/completions",
      {
        models: MODELS,
        messages,
        max_tokens: maxTokens,
        temperature,
        // Reasoning models otherwise spend the token budget thinking and cut the answer short.
        reasoning: { effort: "low", exclude: true },
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "HTTP-Referer": "https://github.com/travel-app",
          "X-Title": "Travel Planner",
        },
      }
    );
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new AIError("The AI returned an empty response, please try again");
    return text;
  } catch (err) {
    if (err instanceof AIError) throw err;
    const status = err.response?.status;
    console.error("[ai] OpenRouter error", status, err.response?.data || err.message);
    if (status === 429) throw new AIError("The AI is busy right now. Try again in a minute.");
    throw new AIError("Couldn't reach the AI assistant. Please try again.");
  }
}

/**
 * Closes a JSON value that was cut off mid-way (e.g. the model hit its token
 * limit), keeping every element that was fully written.
 */
function repairTruncated(text) {
  const stack = [];
  let inString = false;
  let escaped = false;
  let lastComplete = -1;
  let openAtComplete = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "[" || ch === "{") stack.push(ch);
    else if (ch === "]" || ch === "}") {
      stack.pop();
      lastComplete = i;
      openAtComplete = [...stack];
    }
  }
  if (lastComplete < 0) return null;
  const closers = openAtComplete.reverse().map((c) => (c === "[" ? "]" : "}")).join("");
  return text.slice(0, lastComplete + 1) + closers;
}

/** Extracts the first JSON array/object from a model reply, salvaging truncated replies. */
export function parseJson(text) {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) throw new AIError("The AI response was not in the expected format");
  const open = cleaned[start];
  const close = open === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(close);
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    const repaired = repairTruncated(cleaned.slice(start));
    try {
      if (repaired) return JSON.parse(repaired);
    } catch {}
    throw new AIError("The AI response was not in the expected format, please retry");
  }
}

export const travelSystemPrompt = (ctx = {}) => {
  const lines = [
    "You are a friendly, expert travel assistant inside a trip-planning app.",
    "Give concise, practical, well-structured answers. Use short paragraphs and '-' bullet lists. Do not use markdown headings, tables or bold markers.",
    "When you are unsure about prices, opening hours or visa rules, say so and suggest checking an official source.",
  ];
  if (ctx.destination) lines.push(`The user is planning a trip to ${ctx.destination}.`);
  if (ctx.startDate && ctx.endDate)
    lines.push(`Trip dates: ${ctx.startDate} to ${ctx.endDate}.`);
  if (ctx.places?.length)
    lines.push(`Places already saved: ${ctx.places.slice(0, 15).join(", ")}.`);
  return lines.join(" ");
};

// Simple fixed-window rate limiter per user, to protect the free AI quota.
const windows = new Map();
export function rateLimit(limit = 20, windowMs = 60_000) {
  return (req, res, next) => {
    const key = req.clerkUserId || req.ip;
    const now = Date.now();
    const w = windows.get(key);
    if (!w || now - w.start > windowMs) {
      windows.set(key, { start: now, count: 1 });
      return next();
    }
    if (++w.count > limit) {
      return res.status(429).json({ error: "Too many requests, slow down a little" });
    }
    next();
  };
}

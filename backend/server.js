import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50kb" }));

const PORT = process.env.PORT || 8787;

// ---- Provider config -------------------------------------------------
// Works with any OpenAI-compatible chat completions endpoint:
// OpenAI, Groq, OpenRouter, Ollama (local), etc. Just change the .env values.
const PROVIDER_BASE_URL =
  process.env.AI_BASE_URL || "https://api.openai.com/v1";
const PROVIDER_API_KEY = process.env.AI_API_KEY || "";
const PROVIDER_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 30000);

// ---- JSON schema the model must follow --------------------------------
const STOP_TYPES = ["food", "activity", "transport", "lodging", "other"];

const SYSTEM_PROMPT = `You are a trip planning assistant. Given a free-form trip description, return ONLY a single JSON object (no prose, no markdown fences) describing a day-by-day itinerary.

Shape (strict):
{
  "title": string,               // short trip title, e.g. "5 Days in Lisbon"
  "destination": string,
  "summary": string,             // 1-2 sentence overview
  "days": [
    {
      "day": number,             // 1-indexed
      "title": string,           // short theme for the day
      "stops": [
        {
          "time": string,        // e.g. "9:00 AM" or "Morning"
          "name": string,
          "description": string, // 1-3 sentences
          "type": "food" | "activity" | "transport" | "lodging" | "other"
        }
      ]
    }
  ]
}

Rules:
- Return between 1 and 14 days based on what the user describes. If they don't give a duration, pick a sensible default (3-5 days) and mention it in the summary.
- Each day should have 2-6 stops.
- "type" must be exactly one of: food, activity, transport, lodging, other.
- Output must be valid JSON and nothing else.`;

// ---- Helpers ------------------------------------------------------------

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

function extractJson(text) {
  if (!text) return null;
  // Strip common markdown code fences if the model ignores instructions.
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to salvage by grabbing the outermost { ... } block.
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Manual, dependency-free shape validation. Returns { ok, errors }.
function validateItinerary(data) {
  const errors = [];
  if (!data || typeof data !== "object") {
    return { ok: false, errors: ["Response was not a JSON object."] };
  }
  if (typeof data.title !== "string" || !data.title.trim()) {
    errors.push("Missing or invalid 'title'.");
  }
  if (typeof data.destination !== "string" || !data.destination.trim()) {
    errors.push("Missing or invalid 'destination'.");
  }
  if (typeof data.summary !== "string") {
    errors.push("Missing or invalid 'summary'.");
  }
  if (!Array.isArray(data.days) || data.days.length === 0) {
    errors.push("Missing or empty 'days' array.");
    return { ok: false, errors };
  }
  data.days.forEach((day, i) => {
    if (typeof day.day !== "number") {
      errors.push(`days[${i}].day must be a number.`);
    }
    if (typeof day.title !== "string" || !day.title.trim()) {
      errors.push(`days[${i}].title must be a non-empty string.`);
    }
    if (!Array.isArray(day.stops) || day.stops.length === 0) {
      errors.push(`days[${i}].stops must be a non-empty array.`);
      return;
    }
    day.stops.forEach((stop, j) => {
      if (typeof stop.name !== "string" || !stop.name.trim()) {
        errors.push(`days[${i}].stops[${j}].name must be a non-empty string.`);
      }
      if (typeof stop.description !== "string") {
        errors.push(`days[${i}].stops[${j}].description must be a string.`);
      }
      if (typeof stop.time !== "string") {
        errors.push(`days[${i}].stops[${j}].time must be a string.`);
      }
      if (!STOP_TYPES.includes(stop.type)) {
        // Not fatal — we normalize it below — but worth tracking.
        errors.push(
          `days[${i}].stops[${j}].type "${stop.type}" is not one of ${STOP_TYPES.join(", ")}; defaulting to "other".`
        );
      }
    });
  });
  // Only the first N errors are "hard" (missing required fields). Type
  // mismatches on stop.type are soft and get normalized, not rejected.
  const hardErrors = errors.filter((e) => !e.includes('defaulting to "other"'));
  return { ok: hardErrors.length === 0, errors, hardErrors };
}

// Normalize small, non-fatal issues (bad enum values, missing ids) instead
// of failing the whole request over cosmetic model mistakes.
function normalizeItinerary(data) {
  let stopCounter = 0;
  return {
    title: data.title?.trim() || "Untitled trip",
    destination: data.destination?.trim() || "",
    summary: data.summary?.trim() || "",
    days: data.days.map((day, i) => ({
      day: typeof day.day === "number" ? day.day : i + 1,
      title: day.title?.trim() || `Day ${i + 1}`,
      stops: (day.stops || []).map((stop) => ({
        id: `stop-${Date.now()}-${stopCounter++}`,
        time: stop.time?.trim() || "",
        name: stop.name?.trim() || "Untitled stop",
        description: stop.description?.trim() || "",
        type: STOP_TYPES.includes(stop.type) ? stop.type : "other",
      })),
    })),
  };
}

async function callModel(userPrompt, { repairNote } = {}) {
  const { signal, cancel } = withTimeout(REQUEST_TIMEOUT_MS);
  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ];
    if (repairNote) {
      messages.push({
        role: "user",
        content: `Your previous response was invalid: ${repairNote}\nReturn ONLY the corrected JSON object, matching the exact shape described above.`,
      });
    }

    const res = await fetch(`${PROVIDER_BASE_URL}/chat/completions`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PROVIDER_API_KEY}`,
      },
      body: JSON.stringify({
        model: PROVIDER_MODEL,
        messages,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      const err = new Error(
        `Upstream model provider returned ${res.status}: ${bodyText.slice(0, 300)}`
      );
      err.status = res.status;
      throw err;
    }

    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? "";
    return text;
  } finally {
    cancel();
  }
}

// ---- Route ---------------------------------------------------------------

app.post("/api/plan-trip", async (req, res) => {
  const prompt = (req.body?.prompt || "").toString().trim();

  if (!prompt) {
    return res.status(400).json({ error: "Please describe your trip first." });
  }
  if (prompt.length > 2000) {
    return res
      .status(400)
      .json({ error: "That description is too long — keep it under 2000 characters." });
  }
  if (!PROVIDER_API_KEY) {
    return res.status(500).json({
      error:
        "Server is missing an AI_API_KEY. Add one to backend/.env (see .env.example).",
    });
  }

  try {
    // Attempt 1
    let raw = await callModel(prompt);
    let parsed = extractJson(raw);
    let validation = parsed
      ? validateItinerary(parsed)
      : { ok: false, errors: ["Response was not valid JSON."] };

    // Attempt 2: ask the model to repair its own broken output.
    if (!validation.ok) {
      const note = validation.errors.slice(0, 5).join(" ");
      raw = await callModel(prompt, { repairNote: note || "Invalid JSON." });
      parsed = extractJson(raw);
      validation = parsed
        ? validateItinerary(parsed)
        : { ok: false, errors: ["Response was not valid JSON."] };
    }

    if (!validation.ok) {
      return res.status(422).json({
        error:
          "The model couldn't produce a usable itinerary after two attempts. Try rephrasing your trip description, or try again.",
        details: validation.errors.slice(0, 5),
      });
    }

    const itinerary = normalizeItinerary(parsed);
    return res.json({ itinerary });
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({
        error: "The model took too long to respond. Please try again.",
      });
    }
    if (err.status === 401) {
      return res
        .status(500)
        .json({ error: "AI provider rejected the API key. Check backend/.env." });
    }
    if (err.status === 429) {
      return res
        .status(429)
        .json({ error: "Rate limited by the AI provider. Wait a moment and try again." });
    }
    console.error(err);
    return res
      .status(502)
      .json({ error: "Something went wrong calling the AI model. Please try again." });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Trip planner backend listening on http://localhost:${PORT}`);
  if (!PROVIDER_API_KEY) {
    console.warn("⚠️  AI_API_KEY is not set. Copy .env.example to .env and fill it in.");
  }
});

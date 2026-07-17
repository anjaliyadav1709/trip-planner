import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "waypoint:lastTrip";

export function loadSavedSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.itinerary && parsed.prompt) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveSession(prompt, itinerary) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ prompt, itinerary }));
  } catch {
    // localStorage can fail (private mode, quota) — non-fatal, just skip saving.
  }
}

function clearSavedSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Encapsulates the request lifecycle for planning a trip:
 * - loading / error / empty / success states
 * - aborts in-flight requests when a new one starts
 * - ignores responses from requests that are no longer the latest
 *   (fixes the "stale response overwrites newer one" failure mode)
 */
export function useTripPlanner() {
  const [itinerary, setItinerary] = useState(null);
  const [status, setStatus] = useState("empty"); // empty | loading | error | success
  const [error, setError] = useState(null);
  const [lastPrompt, setLastPrompt] = useState("");

  const requestIdRef = useRef(0);
  const abortRef = useRef(null);

  const planTrip = useCallback(async (prompt) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    // Cancel any in-flight request and mark it stale.
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const thisRequestId = ++requestIdRef.current;

    setStatus("loading");
    setError(null);
    setLastPrompt(trimmed);

    try {
      const res = await fetch(`${API_BASE}/api/plan-trip`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: trimmed }),
  signal: controller.signal,
});

      const data = await res.json().catch(() => null);

      // If a newer request has started since this one began, drop this result.
      if (thisRequestId !== requestIdRef.current) return;

      if (!res.ok || !data?.itinerary) {
        setStatus("error");
        setError({
          message: data?.error || "Something went wrong. Please try again.",
          details: data?.details,
        });
        return;
      }

      setItinerary(data.itinerary);
      setStatus("success");
      saveSession(trimmed, data.itinerary);
    } catch (err) {
      if (thisRequestId !== requestIdRef.current) return; // stale/aborted, ignore
      if (err.name === "AbortError") return; // superseded by a newer request
      setStatus("error");
      setError({ message: "Couldn't reach the server. Check your connection and try again." });
    }
  }, []);

  const retry = useCallback(() => {
    if (lastPrompt) planTrip(lastPrompt);
  }, [lastPrompt, planTrip]);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    requestIdRef.current++;
    setItinerary(null);
    setStatus("empty");
    setError(null);
    clearSavedSession();
  }, []);

  const restoreSession = useCallback((session) => {
    setItinerary(session.itinerary);
    setLastPrompt(session.prompt);
    setStatus("success");
  }, []);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return {
    itinerary,
    setItinerary,
    status,
    error,
    lastPrompt,
    planTrip,
    retry,
    reset,
    restoreSession,
  };
}

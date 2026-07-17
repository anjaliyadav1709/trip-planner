import { useEffect, useState } from "react";
import TripForm from "./components/TripForm.jsx";
import Itinerary from "./components/Itinerary.jsx";
import EmptyState from "./components/EmptyState.jsx";
import LoadingState from "./components/LoadingState.jsx";
import ErrorState from "./components/ErrorState.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import { useTripPlanner, loadSavedSession } from "./hooks/useTripPlanner.js";

export default function App() {
  const {
    itinerary,
    setItinerary,
    status,
    error,
    planTrip,
    retry,
    reset,
    restoreSession,
  } = useTripPlanner();

  const [savedSession, setSavedSession] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem("waypoint:theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("waypoint:theme", theme);
  }, [theme]);

  useEffect(() => {
    setSavedSession(loadSavedSession());
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__mark" aria-hidden="true">
            ✦
          </span>
          <span className="app-header__name">Waypoint</span>
        </div>
        <ThemeToggle theme={theme} onToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} />
      </header>

      <main className="app-main">
        <div className="app-intro">
          <h1>Tell it about your trip. Get a route you can actually shape.</h1>
          <p>Free-form input in, an editable day-by-day itinerary out — expand a stop, reorder it, or drop it.</p>
        </div>

        <TripForm onSubmit={planTrip} isLoading={status === "loading"} />

        {savedSession && status === "empty" ? (
          <div className="saved-session-banner">
            <span>
              Pick up where you left off: <strong>{savedSession.itinerary.title}</strong>
            </span>
            <div className="saved-session-banner__actions">
              <button
                type="button"
                onClick={() => {
                  restoreSession(savedSession);
                  setSavedSession(null);
                }}
              >
                Reload it
              </button>
              <button type="button" className="ghost" onClick={() => setSavedSession(null)}>
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <div className="app-result">
          {status === "empty" && <EmptyState />}
          {status === "loading" && <LoadingState />}
          {status === "error" && <ErrorState error={error} onRetry={retry} />}
          {status === "success" && itinerary && (
            <Itinerary itinerary={itinerary} setItinerary={setItinerary} onReset={reset} />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>Built for the Frontend Internship Assignment — trip planner track.</p>
      </footer>
    </div>
  );
}

import { useState } from "react";

const EXAMPLES = [
  "4 days in Lisbon, mid-range budget, love pastries and viewpoints, no museums",
  "Weekend in the Catskills, hiking + cozy cabin food, traveling by car",
  "7-day Japan trip: Tokyo then Kyoto, first time visiting, public transit",
];

export default function TripForm({ onSubmit, isLoading }) {
  const [value, setValue] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim() || isLoading) return;
    onSubmit(value);
  }

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      <label htmlFor="trip-input" className="trip-form__label">
        Describe your trip
      </label>
      <textarea
        id="trip-input"
        className="trip-form__textarea"
        placeholder="Where are you going, for how long, and what do you like? e.g. “5 days in Oaxaca, food-focused, traveling with a toddler, budget-friendly.”"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        maxLength={2000}
        disabled={isLoading}
      />
      <div className="trip-form__row">
        <div className="trip-form__examples">
          {EXAMPLES.map((ex) => (
            <button
              type="button"
              key={ex}
              className="trip-form__chip"
              onClick={() => setValue(ex)}
              disabled={isLoading}
            >
              {ex.length > 40 ? ex.slice(0, 40) + "…" : ex}
            </button>
          ))}
        </div>
        <button type="submit" className="trip-form__submit" disabled={isLoading || !value.trim()}>
          {isLoading ? "Planning…" : "Plan trip"}
        </button>
      </div>
    </form>
  );
}

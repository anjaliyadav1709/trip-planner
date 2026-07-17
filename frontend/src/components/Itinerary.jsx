import DayCard from "./DayCard.jsx";

export default function Itinerary({ itinerary, setItinerary, onReset }) {
  function handleStopAction(dayIndex, stopIndex, action) {
    setItinerary((prev) => {
      if (!prev) return prev;
      const days = prev.days.map((d) => ({ ...d, stops: [...d.stops] }));
      const stops = days[dayIndex].stops;

      if (action === "remove") {
        stops.splice(stopIndex, 1);
      } else if (action === "up" && stopIndex > 0) {
        [stops[stopIndex - 1], stops[stopIndex]] = [stops[stopIndex], stops[stopIndex - 1]];
      } else if (action === "down" && stopIndex < stops.length - 1) {
        [stops[stopIndex + 1], stops[stopIndex]] = [stops[stopIndex], stops[stopIndex + 1]];
      }

      return { ...prev, days };
    });
  }

  return (
    <section className="itinerary" aria-label={`Itinerary for ${itinerary.title}`}>
      <header className="itinerary__header">
        <div>
          <p className="itinerary__eyebrow">{itinerary.destination || "Your trip"}</p>
          <h2 className="itinerary__title">{itinerary.title}</h2>
          {itinerary.summary ? <p className="itinerary__summary">{itinerary.summary}</p> : null}
        </div>
        <button type="button" className="itinerary__reset" onClick={onReset}>
          Plan a new trip
        </button>
      </header>

      <ol className="day-list">
        {itinerary.days.map((day, i) => (
          <DayCard
            key={day.day ?? i}
            day={day}
            dayIndex={i}
            isLastDay={i === itinerary.days.length - 1}
            onStopAction={handleStopAction}
          />
        ))}
      </ol>
    </section>
  );
}

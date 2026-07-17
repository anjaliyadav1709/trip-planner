import StopCard from "./StopCard.jsx";

export default function DayCard({ day, dayIndex, onStopAction, isLastDay }) {
  return (
    <li className="day-card">
      <div className="day-card__rail" aria-hidden="true">
        <span className="day-card__pin">{day.day}</span>
        {!isLastDay ? <span className="day-card__line" /> : null}
      </div>
      <div className="day-card__content">
        <h3 className="day-card__title">{day.title}</h3>
        {day.stops.length === 0 ? (
          <p className="day-card__empty">No stops left for this day.</p>
        ) : (
          <ul className="stop-list">
            {day.stops.map((stop, stopIndex) => (
              <StopCard
                key={stop.id}
                stop={stop}
                isFirst={stopIndex === 0}
                isLast={stopIndex === day.stops.length - 1}
                onRemove={() => onStopAction(dayIndex, stopIndex, "remove")}
                onMoveUp={() => onStopAction(dayIndex, stopIndex, "up")}
                onMoveDown={() => onStopAction(dayIndex, stopIndex, "down")}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

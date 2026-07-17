import { useState } from "react";

const TYPE_META = {
  food: { label: "Food", icon: "🍽" },
  activity: { label: "Activity", icon: "◎" },
  transport: { label: "Transport", icon: "→" },
  lodging: { label: "Lodging", icon: "⌂" },
  other: { label: "Other", icon: "•" },
};

export default function StopCard({ stop, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[stop.type] || TYPE_META.other;

  return (
    <li className={`stop-card stop-card--${stop.type}`}>
      <button
        type="button"
        className="stop-card__summary"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="stop-card__type" title={meta.label} aria-hidden="true">
          {meta.icon}
        </span>
        <span className="stop-card__main">
          {stop.time ? <span className="stop-card__time">{stop.time}</span> : null}
          <span className="stop-card__name">{stop.name}</span>
        </span>
        <span className={`stop-card__chevron ${expanded ? "is-open" : ""}`} aria-hidden="true">
          ⌄
        </span>
      </button>

      {expanded ? (
        <div className="stop-card__body">
          {stop.description ? <p>{stop.description}</p> : <p className="stop-card__muted">No extra detail for this stop.</p>}
          <div className="stop-card__actions">
            <button type="button" onClick={onMoveUp} disabled={isFirst} aria-label="Move stop earlier">
              ↑ Move up
            </button>
            <button type="button" onClick={onMoveDown} disabled={isLast} aria-label="Move stop later">
              ↓ Move down
            </button>
            <button type="button" className="stop-card__remove" onClick={onRemove}>
              Remove
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

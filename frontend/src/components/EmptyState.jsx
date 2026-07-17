export default function EmptyState() {
  return (
    <div className="state-panel state-panel--empty">
      <svg className="state-panel__icon" width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" />
        <path d="M14 22l4-8 4 5 4-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h2>No route plotted yet</h2>
      <p>Describe a trip above — a destination, how long, and what you're into — and your day-by-day itinerary will appear here.</p>
    </div>
  );
}

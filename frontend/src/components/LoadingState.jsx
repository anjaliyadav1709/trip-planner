export default function LoadingState() {
  return (
    <div className="state-panel state-panel--loading" role="status" aria-live="polite">
      <div className="loading-route">
        <span className="loading-route__pin" />
        <span className="loading-route__pin" />
        <span className="loading-route__pin" />
      </div>
      <p>Plotting your route…</p>
      <div className="skeleton-days">
        {[0, 1].map((i) => (
          <div className="skeleton-day" key={i}>
            <div className="skeleton-line skeleton-line--title" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" style={{ width: "70%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

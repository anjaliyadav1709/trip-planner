export default function ErrorState({ error, onRetry }) {
  return (
    <div className="state-panel state-panel--error" role="alert">
      <svg className="state-panel__icon" width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path
          d="M20 6l17 29H3L20 6z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M20 17v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="20" cy="29" r="1.4" fill="currentColor" />
      </svg>
      <h2>The route didn't come through</h2>
      <p>{error?.message || "Something went wrong. Please try again."}</p>
      {error?.details?.length ? (
        <details className="state-panel__details">
          <summary>What the model got wrong</summary>
          <ul>
            {error.details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <button type="button" className="trip-form__submit" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

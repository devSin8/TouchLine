export function RatingRing({ rating, large = false }: { rating: number | null; large?: boolean }) {
  const circumference = 2 * Math.PI * 39;
  const progress = rating === null ? 0 : Math.max(0, Math.min(100, rating)) / 100 * circumference;
  return <div className={`rating-ring ${large ? "large" : ""}`}>
    <svg viewBox="0 0 100 100" aria-label={rating === null ? "Rating unavailable" : `${Math.round(rating)} percentile`}>
      <circle className="ring-track" cx="50" cy="50" r="39" />
      <circle className="ring-progress" cx="50" cy="50" r="39" style={{ strokeDasharray: `${progress} ${circumference}` }} />
    </svg>
    <div className="ring-value">{rating === null ? <span>—</span> : <><b>{Math.round(rating)}</b><small>PR</small></>}</div>
  </div>;
}

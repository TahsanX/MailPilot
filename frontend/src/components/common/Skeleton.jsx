export default function Skeleton({ height = 16, width = "100%", className = "" }) {
  return <span className={`skeleton ${className}`} style={{ height, width }} aria-hidden="true" />;
}

export function SkeletonBlock({ lines = 3, label = "Loading" }) {
  return (
    <div className="skeleton-block" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={i === 0 ? 24 : 16} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

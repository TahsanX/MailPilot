import Skeleton from "../common/Skeleton";
import Tooltip from "../common/Tooltip";

/** KPI tile. Always shows a label, value, helper caption and the time range it covers. */
export default function StatCard({ label, value, caption, definition, rangeLabel, status = "ready", icon: Icon }) {
  return (
    <div className="stat" aria-busy={status === "loading" || undefined}>
      <div className="stat__top">
        <p className="stat__label">
          {label}
          {definition && <Tooltip text={definition} label={`Definition of ${label}`} />}
        </p>
        {Icon && <Icon size={20} aria-hidden="true" className="stat__icon" />}
      </div>
      {status === "loading" ? (
        <>
          <Skeleton height={36} width="50%" />
          <Skeleton height={16} width="80%" />
        </>
      ) : status === "error" ? (
        <p className="stat__value stat__value--muted">—</p>
      ) : (
        <>
          <p className="stat__value">{value}</p>
          {caption && <p className="stat__caption">{caption}</p>}
          {rangeLabel && <p className="stat__range">{rangeLabel}</p>}
        </>
      )}
    </div>
  );
}

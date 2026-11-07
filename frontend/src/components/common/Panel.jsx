import { WarningCircle } from "@phosphor-icons/react";
import Button from "./Button";
import { SkeletonBlock } from "./Skeleton";
import Tooltip from "./Tooltip";

/** Card with title, optional definition and loading / error handling for its content. */
export default function Panel({ title, subtitle, definition, status = "ready", error, onRetry, actions, children, className = "", headingLevel: H = "h2" }) {
  return (
    <section className={`panel ${className}`} aria-busy={status === "loading" || undefined}>
      <header className="panel__head">
        <div>
          <H className="panel__title">
            {title}
            {definition && <Tooltip text={definition} label={`Definition of ${title}`} />}
          </H>
          {subtitle && <p className="panel__sub">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {status === "loading" && <SkeletonBlock lines={4} label={`Loading ${title}`} />}
      {status === "error" && (
        <div className="inline-error" role="alert">
          <WarningCircle size={20} aria-hidden="true" />
          <div>
            <p>{error || "This section could not be loaded."}</p>
            {onRetry && (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                Try again
              </Button>
            )}
          </div>
        </div>
      )}
      {status === "ready" && children}
    </section>
  );
}

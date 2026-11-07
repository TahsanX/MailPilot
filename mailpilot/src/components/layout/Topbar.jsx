import { EnvelopeSimple, List, Flask } from "@phosphor-icons/react";
import Badge from "../common/Badge";
import { RANGES } from "../../utils/constants";

export default function Topbar({ range, onRangeChange, onOpenMenu, gmailConnected, isSample, showRange }) {
  return (
    <header className="topbar">
      <button type="button" className="icon-btn topbar__menu" onClick={onOpenMenu} aria-label="Open menu">
        <List size={24} aria-hidden="true" />
      </button>
      <div className="topbar__status">
        <Badge tone={gmailConnected ? "success" : "neutral"} icon={EnvelopeSimple}>
          {gmailConnected ? "Gmail connected" : "Gmail not connected"}
        </Badge>
        {isSample && (
          <Badge tone="warning" icon={Flask}>
            Sample data
          </Badge>
        )}
      </div>
      {showRange && (
        <div className="segmented" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r.value} type="button" className={`segmented__btn ${range === r.value ? "segmented__btn--on" : ""}`} aria-pressed={range === r.value} onClick={() => onRangeChange(r.value)}>
              {r.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

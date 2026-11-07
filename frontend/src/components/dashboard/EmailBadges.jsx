import { ArrowDown, CheckCircle, Clock, EnvelopeSimple, Minus, NotePencil, UserSwitch, WarningCircle, WarningOctagon } from "@phosphor-icons/react";
import Badge from "../common/Badge";
import { PRIORITY_LABELS, STATUS_LABELS } from "../../utils/constants";

const PRIORITY = {
  urgent: { tone: "danger", icon: WarningOctagon },
  medium: { tone: "warning", icon: Minus },
  low: { tone: "neutral", icon: ArrowDown },
};

const STATUS = {
  unread: { tone: "brand", icon: EnvelopeSimple },
  draft_ready: { tone: "brand", icon: NotePencil },
  pending: { tone: "warning", icon: Clock },
  handled: { tone: "success", icon: CheckCircle },
  overdue: { tone: "danger", icon: WarningCircle },
  delegated: { tone: "neutral", icon: UserSwitch },
};

export function PriorityBadge({ priority }) {
  const p = PRIORITY[priority] ?? PRIORITY.low;
  return (
    <Badge tone={p.tone} icon={p.icon}>
      {PRIORITY_LABELS[priority] ?? priority}
    </Badge>
  );
}

export function StatusBadge({ status }) {
  const s = STATUS[status] ?? { tone: "neutral" };
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

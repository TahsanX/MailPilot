import { PencilSimple, WarningCircle } from "@phosphor-icons/react";
import Badge from "../common/Badge";
import { DEPARTMENTS, PROFESSIONS, RESPONSE_TONES } from "../../utils/constants";
import { getFlags } from "../../utils/validation";

function Row({ label, children, onEdit, editLabel }) {
  return (
    <div className="review__row">
      <dt>{label}</dt>
      <dd>{children}</dd>
      {onEdit && (
        <button type="button" className="link-btn" onClick={onEdit} aria-label={editLabel}>
          <PencilSimple size={16} aria-hidden="true" /> Edit
        </button>
      )}
    </div>
  );
}

export default function ReviewStep({ config, account, steps, goTo, submitError }) {
  const { isPrivateService, hr, care } = getFlags(config);
  const kb = config.knowledgeBase;
  const profession = PROFESSIONS.find((p) => p.value === config.profession)?.label ?? "—";
  const jump = (id) => () => goTo(steps.findIndex((s) => s.id === id));
  const filledFaqs = kb.faqs.filter((f) => f.question.trim() && f.answer.trim()).length;
  const tone = RESPONSE_TONES.find((t) => t.value === config.customerCarePreferences.responseTone)?.label;

  return (
    <div className="stack">
      <div>
        <h2 className="t-h5">Review your setup</h2>
        <p className="muted">Check the details below. You can change them later in Settings.</p>
      </div>

      <dl className="review">
        <Row label="Account" onEdit={jump("account")} editLabel="Edit account">
          {account.name} · {account.email}
        </Row>

        <Row label="Profession" onEdit={jump("profession")} editLabel="Edit profession">
          {profession}
        </Row>

        {isPrivateService && (
          <Row label="Department" onEdit={jump("department")} editLabel="Edit department">
            {config.neither ? "Neither" : DEPARTMENTS.filter((d) => config.departments.includes(d.value)).map((d) => d.label).join(", ")}
          </Row>
        )}

        <Row label="Pipelines">
          <span className="badge-row">
            <Badge tone="success">General</Badge>
            {hr && <Badge tone="success">HR</Badge>}
            {care && <Badge tone="success">Customer Care</Badge>}
          </span>
          <span className="review__note">The General pipeline always runs.</span>
        </Row>

        <Row label="Knowledge base" onEdit={jump("knowledge")} editLabel="Edit knowledge base">
          <ul className="review__list">
            {(hr || care) && (
              <>
                <li>Company: {kb.companyName || "—"}</li>
                <li>{filledFaqs} {filledFaqs === 1 ? "question" : "questions"} with answers</li>
              </>
            )}
            {hr && <li>Target role: {config.hrPreferences.targetRole || "—"}</li>}
            {care && <li>Response tone: {tone}</li>}
            <li>{kb.documents.length === 0 ? "No documents added" : `${kb.documents.length} PDF ${kb.documents.length === 1 ? "document" : "documents"} selected`}</li>
          </ul>
        </Row>
      </dl>

      <div className="notice">
        <WarningCircle size={20} aria-hidden="true" />
        <p>
          Gmail is not connected yet. After your account is created, the dashboard shows Gmail as connected only once your Make.com scenario confirms it. Uploaded documents are summarised in the background; check Settings for their status.
        </p>
      </div>

      {submitError && (
        <p className="field__error" role="alert">
          {submitError}
        </p>
      )}
    </div>
  );
}

import { useState } from "react";
import { BookOpenText, EnvelopeSimple, FilePdf, SignOut, Trash } from "@phosphor-icons/react";
import Panel from "../common/Panel";
import Button from "../common/Button";
import Badge from "../common/Badge";
import EmptyState from "../common/EmptyState";
import { useToast } from "../../hooks/toastContext";
import { clearSampleData } from "../../services/api";
import { DEPARTMENTS, PROFESSIONS, RESPONSE_TONES } from "../../utils/constants";
import { formatFileSize } from "../../utils/formatters";

const DOC_STATUS = {
  uploaded: { tone: "success", label: "Summarised" },
  processing: { tone: "warning", label: "Summarising…" },
  failed: { tone: "danger", label: "Summary failed" },
  needs_reselect: { tone: "neutral", label: "Select this file again" },
  selected: { tone: "neutral", label: "Not yet uploaded" },
};

export default function Settings({ user, config, flags, gmailConnected, sampleDataAllowed, isSample, onDataChanged, onSignOut }) {
  const { notify } = useToast();
  const [clearing, setClearing] = useState(false);
  const kb = config.knowledgeBase;
  const profession = PROFESSIONS.find((p) => p.value === config.profession)?.label ?? "—";
  const faqs = kb.faqs.filter((f) => f.question.trim() && f.answer.trim());
  const hasKb = faqs.length > 0 || kb.documents.length > 0 || kb.companyOverview.trim() || kb.companyName.trim();
  const tone = RESPONSE_TONES.find((t) => t.value === config.customerCarePreferences.responseTone)?.label;

  async function handleClearSample() {
    setClearing(true);
    try {
      await clearSampleData();
      notify("Sample data removed.");
      onDataChanged();
    } catch (err) {
      notify(err.message || "Could not remove sample data.", "error");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="stack-lg">
      <Panel title="Your account" subtitle="Set when you created your account. Setup answers cannot be edited yet; contact support if something needs to change.">
        <dl className="kv">
          <div><dt>Name</dt><dd>{user.name}</dd></div>
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div><dt>Profession</dt><dd>{profession}</dd></div>
          {config.profession === "private_service_holder" && (
            <div><dt>Department</dt><dd>{config.neither ? "Neither" : DEPARTMENTS.filter((d) => config.departments.includes(d.value)).map((d) => d.label).join(", ")}</dd></div>
          )}
          <div>
            <dt>Pipelines</dt>
            <dd className="badge-row">
              <Badge tone="success">General</Badge>
              {flags.hr && <Badge tone="success">HR</Badge>}
              {flags.care && <Badge tone="success">Customer Care</Badge>}
            </dd>
          </div>
          {flags.hr && <div><dt>Target role</dt><dd>{config.hrPreferences.targetRole || "—"}</dd></div>}
          {flags.care && <div><dt>Response tone</dt><dd>{tone}</dd></div>}
        </dl>
      </Panel>

      <Panel title="Knowledge base" subtitle="Information the assistant can use, collected when you created your account.">
        {!hasKb ? (
          <EmptyState icon={BookOpenText} title="No knowledge base was added">
            You can add one the next time you create an account.
          </EmptyState>
        ) : (
          <div className="stack">
            <dl className="kv">
              {kb.companyName.trim() && <div><dt>Company</dt><dd>{kb.companyName}</dd></div>}
              {kb.companyOverview.trim() && <div><dt>Overview</dt><dd>{kb.companyOverview}</dd></div>}
              <div><dt>FAQs</dt><dd>{faqs.length}</dd></div>
            </dl>
            {kb.documents.length > 0 && (
              <ul className="filelist">
                {kb.documents.map((d) => {
                  const s = DOC_STATUS[d.status] ?? DOC_STATUS.selected;
                  return (
                    <li key={d.id} className="filelist__item">
                      <FilePdf size={24} aria-hidden="true" />
                      <div className="filelist__meta">
                        <p className="filelist__name">{d.name}</p>
                        <p className="filelist__sub">{formatFileSize(d.size)}</p>
                        {d.status === "failed" && d.summaryError && <p className="field__error">{d.summaryError}</p>}
                      </div>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Integrations" subtitle="Connections run through Make.com scenarios.">
        <div className="integration">
          <EnvelopeSimple size={24} aria-hidden="true" />
          <div>
            <p className="integration__name">Gmail</p>
            <p className="muted">{gmailConnected ? "Connected" : "Not connected. This changes only after your Make.com scenario confirms the connection."}</p>
          </div>
          <Badge tone={gmailConnected ? "success" : "neutral"}>{gmailConnected ? "Connected" : "Not connected"}</Badge>
        </div>
      </Panel>

      {sampleDataAllowed && (
        <Panel title="Sample data" subtitle="Preview data generated for this interface. Remove it once real mail starts arriving.">
          <Button variant="secondary" icon={Trash} loading={clearing} disabled={!isSample} onClick={handleClearSample}>
            {isSample ? "Remove sample data" : "No sample data loaded"}
          </Button>
        </Panel>
      )}

      <Panel title="Session">
        <Button variant="secondary" icon={SignOut} onClick={onSignOut}>
          Log out
        </Button>
      </Panel>
    </div>
  );
}

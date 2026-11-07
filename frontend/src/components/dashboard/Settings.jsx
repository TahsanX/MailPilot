import { useEffect, useState } from "react";
import { DownloadSimple, BookOpenText, EnvelopeSimple, FilePdf, PaperPlaneTilt, SignOut, Trash } from "@phosphor-icons/react";
import Panel from "../common/Panel";
import Button from "../common/Button";
import Badge from "../common/Badge";
import EmptyState from "../common/EmptyState";
import { useToast } from "../../hooks/toastContext";
import {
  automationConfigured,
  clearSampleData,
  downloadExcelReport,
  fetchIntegrationStatus,
  gmailConnectUrl,
  requestTelegramLinkCode,
} from "../../services/api";
import { DEPARTMENTS, PROFESSIONS, RESPONSE_TONES } from "../../utils/constants";
import { formatFileSize } from "../../utils/formatters";

const DOC_STATUS = {
  uploaded: { tone: "success", label: "Summarised" },
  processing: { tone: "warning", label: "Summarising…" },
  failed: { tone: "danger", label: "Summary failed" },
  needs_reselect: { tone: "neutral", label: "Select this file again" },
  selected: { tone: "neutral", label: "Not yet uploaded" },
};

export default function Settings({ user, config, flags, sampleDataAllowed, isSample, onDataChanged, onSignOut }) {
  const { notify } = useToast();
  const [clearing, setClearing] = useState(false);
  const [integrations, setIntegrations] = useState(null);
  const [telegramCode, setTelegramCode] = useState(null);
  const [requestingCode, setRequestingCode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const automationOn = automationConfigured();
  const kb = config.knowledgeBase;
  const profession = PROFESSIONS.find((p) => p.value === config.profession)?.label ?? "—";
  const faqs = kb.faqs.filter((f) => f.question.trim() && f.answer.trim());
  const hasKb = faqs.length > 0 || kb.documents.length > 0 || kb.companyOverview.trim() || kb.companyName.trim();
  const tone = RESPONSE_TONES.find((t) => t.value === config.customerCarePreferences.responseTone)?.label;

  useEffect(() => {
    if (!automationOn) return;
    fetchIntegrationStatus().then(setIntegrations).catch(() => {});
  }, [automationOn]);

  // A full page navigation, not window.open: popup blockers silently swallow the latter, and
  // coming back through the callback remounts Settings so the connected state is re-read.
  function handleConnectGmail() {
    window.location.href = gmailConnectUrl(user.id);
  }

  async function handleGetTelegramCode() {
    setRequestingCode(true);
    try {
      const { code } = await requestTelegramLinkCode();
      setTelegramCode(code);
    } catch (err) {
      notify(err.message || "Could not generate a code.", "error");
    } finally {
      setRequestingCode(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await downloadExcelReport();
    } catch (err) {
      notify(err.message || "Could not generate the report.", "error");
    } finally {
      setExporting(false);
    }
  }

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

      <Panel title="Integrations" subtitle="Connect Gmail so the automation service can read and draft mail, and Telegram for urgent alerts.">
        {!automationOn ? (
          <EmptyState icon={EnvelopeSimple} title="Automation service not configured">
            Set VITE_AUTOMATION_URL to enable Gmail, Telegram and Excel export.
          </EmptyState>
        ) : (
          <div className="stack">
            <div className="integration">
              <EnvelopeSimple size={24} aria-hidden="true" />
              <div>
                <p className="integration__name">Gmail</p>
                <p className="muted">
                  {integrations?.gmailConnected ? `Connected as ${integrations.gmailEmail}` : "Lets the assistant read and draft replies in your inbox."}
                </p>
              </div>
              {integrations?.gmailConnected ? (
                <Badge tone="success">Connected</Badge>
              ) : (
                <Button variant="secondary" size="sm" onClick={handleConnectGmail}>
                  Connect
                </Button>
              )}
            </div>

            <div className="integration">
              <PaperPlaneTilt size={24} aria-hidden="true" />
              <div>
                <p className="integration__name">Telegram</p>
                <p className="muted">
                  {integrations?.telegramConnected
                    ? "Connected. Urgent emails are sent here."
                    : telegramCode
                      ? `Send "/start ${telegramCode}" to the bot within 10 minutes.`
                      : "Get urgent email alerts in a chat."}
                </p>
              </div>
              {integrations?.telegramConnected ? (
                <Badge tone="success">Connected</Badge>
              ) : (
                <Button variant="secondary" size="sm" loading={requestingCode} onClick={handleGetTelegramCode}>
                  {telegramCode ? "Get a new code" : "Get a code"}
                </Button>
              )}
            </div>

            <div className="integration">
              <DownloadSimple size={24} aria-hidden="true" />
              <div>
                <p className="integration__name">Excel report</p>
                <p className="muted">Download all processed emails and candidates as a spreadsheet.</p>
              </div>
              <Button variant="secondary" size="sm" loading={exporting} onClick={handleExport}>
                Download
              </Button>
            </div>
          </div>
        )}
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

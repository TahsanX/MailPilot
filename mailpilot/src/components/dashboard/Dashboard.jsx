import { useMemo, useState } from "react";
import AppShell from "../layout/AppShell";
import Overview from "./Overview";
import Analytics from "./Analytics";
import EmailActivity from "./EmailActivity";
import HRCandidates from "./HRCandidates";
import CustomerCarePanel from "./CustomerCarePanel";
import Settings from "./Settings";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useToast } from "../../hooks/toastContext";
import { fetchCandidates, fetchCustomerCareStats, fetchDashboardSummary, fetchEmailActivity, loadSampleData, markEmailHandled } from "../../services/api";
import { NAV_ITEMS, RANGES } from "../../utils/constants";

const TITLES = {
  overview: ["Overview", "What needs your attention and what MailPilot has done."],
  activity: ["Email activity", "Search and filter every processed email."],
  analytics: ["Analytics", "Patterns in your incoming mail and response times."],
  hr: ["HR candidates", "Candidates read from CVs attached to HR emails."],
  care: ["Customer Care", "Customer questions, answers and handovers."],
  settings: ["Settings and knowledge base", "Your setup, knowledge base and integrations."],
};

export default function Dashboard({ user, profile, onSignOut, onLegal }) {
  const { notify } = useToast();
  const [view, setView] = useState("overview");
  const [range, setRange] = useState("30d");

  const flags = useMemo(() => ({ hr: profile.departments.includes("hr"), care: profile.departments.includes("customer_care") }), [profile.departments]);
  const items = NAV_ITEMS.filter((i) => !i.requires || profile.departments.includes(i.requires));
  const rangeLabel = RANGES.find((r) => r.value === range).long;

  const summary = useAsyncData(() => fetchDashboardSummary({ range }), [range]);
  const activity = useAsyncData(() => fetchEmailActivity(), []);
  const candidates = useAsyncData(() => fetchCandidates({ range }), [range], { enabled: flags.hr });
  const care = useAsyncData(() => fetchCustomerCareStats({ range }), [range], { enabled: flags.care });

  function reloadAll() {
    summary.reload();
    activity.reload();
    if (flags.hr) candidates.reload();
    if (flags.care) care.reload();
  }

  async function handleMarkHandled(emailId) {
    try {
      await markEmailHandled(emailId);
      notify("Marked as handled.");
      summary.reload();
      activity.reload();
      if (flags.care) care.reload();
    } catch (err) {
      notify(err.message || "Could not mark this email as handled.", "error");
    }
  }

  const [title, subtitle] = TITLES[view];
  const isSample = summary.data?.isSample ?? false;
  const hasData = summary.data?.hasData ?? true;
  const sampleDataAllowed = summary.data?.sampleDataAllowed ?? false;

  return (
    <AppShell
      items={items}
      active={view}
      onNavigate={setView}
      onLegal={onLegal}
      topbar={{ range, onRangeChange: setRange, gmailConnected: user.gmailConnected, isSample, showRange: ["overview", "analytics", "hr", "care"].includes(view) }}
    >
      <div className="page-head">
        <h1 className="t-h4">{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      {isSample && (
        <p className="sample-note">
          Sample data. These figures are generated for the interface and do not come from your mailbox.
        </p>
      )}
      {!hasData && !isSample && sampleDataAllowed && view === "overview" && (
        <LoadSampleData onLoaded={reloadAll} />
      )}

      {view === "overview" && <Overview summary={summary} rangeLabel={rangeLabel} range={range} flags={flags} onMarkHandled={handleMarkHandled} />}
      {view === "analytics" && <Analytics summary={summary} rangeLabel={rangeLabel} />}
      {view === "activity" && <EmailActivity activity={activity} flags={flags} onMarkHandled={handleMarkHandled} />}
      {view === "hr" && flags.hr && <HRCandidates candidates={candidates} summary={summary} rangeLabel={rangeLabel} />}
      {view === "care" && flags.care && <CustomerCarePanel care={care} config={profile} rangeLabel={rangeLabel} onNavigate={setView} />}
      {view === "settings" && (
        <Settings
          user={user}
          config={profile}
          flags={flags}
          gmailConnected={user.gmailConnected}
          sampleDataAllowed={sampleDataAllowed}
          isSample={isSample}
          onDataChanged={reloadAll}
          onSignOut={onSignOut}
        />
      )}
    </AppShell>
  );
}

function LoadSampleData({ onLoaded }) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);

  return (
    <div className="notice">
      <span>
        <strong>No mail processed yet.</strong> Once Make.com is connected this view fills in on its own. Until then you can preview the
        dashboard with sample data.
      </span>
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            await loadSampleData();
            onLoaded();
            notify("Sample data loaded.");
          } catch (err) {
            notify(err.message || "Could not load sample data.", "error");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Loading…" : "Load sample data"}
      </button>
    </div>
  );
}

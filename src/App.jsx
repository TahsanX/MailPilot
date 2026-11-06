import { useState } from "react";
import "./styles/global.css";

const STORAGE_KEY = "mailpilot_onboarded_v1";

function App() {
  const [onboarded, setOnboarded] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return !!saved;
  });
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? 4 : 1;
  });
  const [answers, setAnswers] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {
          profession: "",
          department: [],
          companyName: "",
          companyInfo: "",
          faqs: [],
          uploadFile: null,
          connections: { gmail: false, telegram: false, excel: false }
        };
      }
    }
    return {
      profession: "",
      department: [],
      companyName: "",
      companyInfo: "",
      faqs: [],
      uploadFile: null,
      connections: { gmail: false, telegram: false, excel: false }
    };
  });
  const [toasts, setToasts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handleAnswer = (field, value) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1 && !answers.profession) return;
    if (step === 2 && answers.profession === "private_service_holder" && answers.department.length === 0) return;
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => { if (step > 1) setStep(step - 1); };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers)
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
      setOnboarded(true);
      showToast("Setup complete! Your configuration has been saved.");
    } catch {
      showToast("Failed to save. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (file) => {
    if (file && file.type !== "application/pdf") {
      showToast("Please upload a PDF file", "error");
      return;
    }
    handleAnswer("uploadFile", file);
    if (file) showToast(`Uploaded: ${file.name}`);
  };

  const handleConnection = async (service) => {
    setAnswers(prev => ({ ...prev, connections: { ...prev.connections, [service]: true } }));
    showToast(`Connecting to ${service.charAt(0).toUpperCase() + service.slice(1)}...`);
    try {
      await fetch(`/api/connect/${service}`, { method: "POST" });
      showToast(`${service} connected!`);
    } catch {
      showToast(`Failed to connect ${service}`, "error");
      setAnswers(prev => ({ ...prev, connections: { ...prev.connections, [service]: false } }));
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1: return <ProfessionStep answers={answers} onChange={handleAnswer} onNext={handleNext} />;
      case 2: return <DepartmentStep answers={answers} onChange={handleAnswer} onNext={handleNext} onBack={handleBack} />;
      case 3: return <KnowledgeStep answers={answers} onChange={handleAnswer} onFileUpload={handleFileUpload} onNext={handleNext} onBack={handleBack} />;
      case 4: return <ConnectionsStep answers={answers} onConnect={handleConnection} onComplete={handleComplete} onBack={handleBack} submitting={submitting} />;
      default: return null;
    }
  };

  return (
    <>
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {t.type === "success" ? (
                <polyline points="20 6 9 17 4 12" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </>
              )}
            </svg>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <main className="container">
        <header className="header">
          <div className="brand">
            <div className="brand-icon">M</div>
            <span>MailPilot</span>
          </div>
          {!onboarded && (
            <div className="q-progress" style={{ width: "160px" }}>
              <div className="q-progress-bar">
                <div className="q-progress-fill" style={{ width: `${(step / 4) * 100}%` }} />
              </div>
            </div>
          )}
        </header>

        {!onboarded ? (
          <div className="hero">
            <div className="hero-badge">AI Email Assistant</div>
            <h1>Your inbox,<br /><span>under control.</span></h1>
            <p>Let AI organize emails, prepare drafts, manage tasks, and save your time. Connect Gmail, Telegram, and Excel via Make.com.</p>
            <button className="hero-cta" onClick={() => setStep(1)}>Get Started</button>
            <p className="hero-note">Your email. Your control. Drafts stay drafts until you send them.</p>
          </div>
        ) : null}

        <div className="questionnaire active">
          {renderStep()}
        </div>

        {onboarded && (
          <>
            <section className="section">
              <h2 className="section-title">Done</h2>
              <p className="section-subtitle">Your MailPilot is configured. Check Make.com for active scenarios.</p>
              <div className="card">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", alignItems: "center", textAlign: "center" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" style={{ marginBottom: "var(--space-3)" }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <strong>Setup Complete</strong>
                  <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                    Profession: {answers.profession?.replace("_", " ")}<br />
                    {answers.department.length > 0 && `Departments: ${answers.department.join(", ")}`}
                  </p>
                  <button className="btn btn-secondary" onClick={() => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }}>
                    Reset Configuration
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        <footer className="footer">
          <p>MailPilot — AI Email Assistant</p>
          <p style={{ marginTop: "var(--space-2)" }}>Integrations powered by Make.com · Gemini API</p>
        </footer>
      </main>
    </>
  );
}

function ProfessionStep({ answers, onChange, onNext }) {
  const professions = [
    { value: "private_service_holder", label: "Private Service Holder", desc: "Work in a private company or organization" },
    { value: "student", label: "Student", desc: "Currently studying at school or university" },
    { value: "business_owner", label: "Business Owner", desc: "Own and operate a business" },
    { value: "freelancer", label: "Freelancer", desc: "Work independently on projects" },
    { value: "other", label: "Other", desc: "None of the above" },
  ];
  return (
    <div className="q-step active">
      <h3 className="section-title">What's your profession?</h3>
      <div className="q-options">
        {professions.map(p => (
          <label key={p.value} className={`q-option ${answers.profession === p.value ? "selected" : ""}`}>
            <input type="radio" name="profession" value={p.value} checked={answers.profession === p.value} onChange={() => { onChange("profession", p.value); onNext(); }} />
            <div>
              <div style={{ fontWeight: 500 }}>{p.label}</div>
              <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>{p.desc}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function DepartmentStep({ answers, onChange, onNext, onBack }) {
  if (answers.profession !== "private_service_holder") return <div onLoad={onNext} />;
  const departments = [
    { id: "hr", label: "HR Department", desc: "Process CV attachments and manage candidates" },
    { id: "customer_care", label: "Customer Service", desc: "Handle customer inquiries from knowledge base" },
    { id: "neither", label: "Neither of them", desc: "I don't work with HR or Customer Service", exclusive: true },
  ];
  const neitherSelected = answers.department.includes("neither");
  return (
    <div className="q-step active">
      <h3 className="section-title">Do you work with?</h3>
      <p className="section-subtitle">Select all that apply. Neither is exclusive.</p>
      <div className="q-options">
        {departments.map(d => (
          <label key={d.id} className={`q-option ${answers.department.includes(d.id) ? "selected" : ""} ${neitherSelected && d.id !== "neither" ? "disabled" : ""}`}>
            <input type="checkbox" checked={answers.department.includes(d.id)} onChange={e => {
              let next = [...answers.department];
              if (d.id === "neither") {
                next = e.target.checked ? ["neither"] : [];
              } else {
                if (next.includes("neither")) next = next.filter(x => x !== "neither");
                next = e.target.checked ? [...next, d.id] : next.filter(x => x !== d.id);
              }
              onChange("department", next);
            }} disabled={neitherSelected && d.id !== "neither"} />
            <div>
              <div style={{ fontWeight: 500 }}>{d.label}</div>
              <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>{d.desc}</div>
            </div>
          </label>
        ))}
      </div>
      <div className="q-nav">
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
        <button className="btn btn-primary" onClick={onNext} disabled={answers.department.length === 0}>Continue</button>
      </div>
    </div>
  );
}

function KnowledgeStep({ answers, onChange, onFileUpload, onNext, onBack }) {
  const hasHR = answers.department.includes("hr");
  const hasCC = answers.department.includes("customer_care");
  const needsCompany = hasHR || hasCC;
  return (
    <div className="q-step active">
      <h3 className="section-title">Knowledge Base</h3>
      <p className="section-subtitle">{needsCompany ? "Required for HR/Customer Service. Helps AI understand your business." : "Optional. Adding info helps AI provide better assistance."}</p>

      {needsCompany && (
        <>
          <div className="q-field">
            <label className="q-label">Company Name</label>
            <input value={answers.companyName} onChange={e => onChange("companyName", e.target.value)} placeholder="Acme Corporation" required />
          </div>
          <div className="q-field">
            <label className="q-label">About Company / Products / Services</label>
            <textarea value={answers.companyInfo} onChange={e => onChange("companyInfo", e.target.value)} placeholder="Describe your company..." rows={3} required />
          </div>
        </>
      )}

      <div className="q-field">
        <label className="q-label">FAQs (optional)</label>
        <p className="q-hint">Add Q&A pairs for the AI to reference.</p>
        {answers.faqs.map((faq, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-3)", padding: "var(--space-3)", background: "var(--color-bg)", borderRadius: "var(--radius-md)" }}>
            <input value={faq.question} onChange={e => { const n = [...answers.faqs]; n[i] = { ...n[i], question: e.target.value }; onChange("faqs", n); }} placeholder="Question" style={{ marginBottom: "var(--space-2)" }} />
            <textarea value={faq.answer} onChange={e => { const n = [...answers.faqs]; n[i] = { ...n[i], answer: e.target.value }; onChange("faqs", n); }} placeholder="Answer" rows={2} />
            {answers.faqs.length > 1 && <button type="button" className="btn btn-secondary" style={{ alignSelf: "flex-end", padding: "var(--space-1) var(--space-3)", fontSize: "0.75rem" }} onClick={() => { const n = answers.faqs.filter((_, j) => j !== i); onChange("faqs", n); }}>Remove</button>}
          </div>
        ))}
        <button type="button" className="btn btn-secondary" style={{ marginTop: "var(--space-3)" }} onClick={() => onChange("faqs", [...answers.faqs, { question: "", answer: "" }])}>Add FAQ</button>
      </div>

      <div className="q-field">
        <label className="q-label">Upload PDF Document</label>
        <div className="upload-zone" onClick={() => document.getElementById("pdf-upload").click()} onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("drag-active"); }} onDragLeave={e => e.currentTarget.classList.remove("drag-active")} onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove("drag-active"); if (e.dataTransfer.files[0]) onFileUpload(e.dataTransfer.files[0]); }}>
          <input id="pdf-upload" type="file" accept=".pdf" onChange={e => e.target.files[0] && onFileUpload(e.target.files[0])} />
          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <div className="upload-text">Drag & drop PDF or click to browse</div>
          <div className="upload-hint">Company policies, product docs, etc. (max 10MB)</div>
        </div>
        {answers.uploadFile && (
          <div className="upload-file">
            <div className="upload-file-info">
              <svg className="upload-file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <div><div className="upload-file-name">{answers.uploadFile.name}</div><div className="upload-file-size">{(answers.uploadFile.size / 1024 / 1024).toFixed(2)} MB</div></div>
            </div>
            <button className="upload-file-remove" onClick={e => { e.stopPropagation(); onFileUpload(null); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        )}
      </div>

      {hasHR && (
        <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--color-border)" }}>
          <h4 style={{ marginBottom: "var(--space-4)" }}>HR Preferences</h4>
          <div className="q-field"><label className="q-label">Target Role / Position</label><input placeholder="Senior Software Engineer" value={answers.targetRole || ""} onChange={e => onChange("targetRole", e.target.value)} /></div>
          <div className="q-field"><label className="q-label">Job Description / Hiring Criteria</label><textarea placeholder="Key skills, experience, qualifications..." rows={3} value={answers.jobDescription || ""} onChange={e => onChange("jobDescription", e.target.value)} /></div>
        </div>
      )}
      {hasCC && (
        <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--color-border)" }}>
          <h4 style={{ marginBottom: "var(--space-4)" }}>Customer Service Preferences</h4>
          <div className="q-field"><label className="q-label">Service / Product Context</label><input placeholder="Describe what customers ask about..." value={answers.serviceContext || ""} onChange={e => onChange("serviceContext", e.target.value)} /></div>
          <div className="q-field"><label className="q-label">Response Tone</label><select value={answers.responseTone || "professional"} onChange={e => onChange("responseTone", e.target.value)}><option value="professional">Professional</option><option value="friendly">Friendly</option><option value="empathetic">Empathetic</option><option value="direct">Direct</option></select></div>
        </div>
      )}
      <div className="q-nav">
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
        <button className="btn btn-primary" onClick={onNext}>Continue</button>
      </div>
    </div>
  );
}

function ConnectionsStep({ answers, onConnect, onComplete, onBack, submitting }) {
  return (
    <div className="q-step active">
      <h3 className="section-title">Connect Integrations</h3>
      <p className="section-subtitle">Click to connect each service via Make.com. All handled through your Make.com scenarios.</p>
      <div className="connections">
        <div className={`conn-card gmail ${answers.connections.gmail ? "connected" : ""}`}>
          <div className="conn-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <div className="conn-title">Gmail</div>
          <p className="conn-desc">Process emails, create drafts, manage threads</p>
          <button className="btn conn-btn btn-primary" onClick={() => onConnect("gmail")} disabled={answers.connections.gmail || submitting}>{answers.connections.gmail ? "Connected" : "Connect Gmail"}</button>
        </div>
        <div className={`conn-card telegram ${answers.connections.telegram ? "connected" : ""}`}>
          <div className="conn-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div className="conn-title">Telegram</div>
          <p className="conn-desc">Receive notifications, send summaries</p>
          <button className="btn conn-btn btn-primary" onClick={() => onConnect("telegram")} disabled={answers.connections.telegram || submitting}>{answers.connections.telegram ? "Connected" : "Connect Telegram"}</button>
        </div>
        <div className={`conn-card excel ${answers.connections.excel ? "connected" : ""}`}>
          <div className="conn-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div className="conn-title">Excel / Sheets</div>
          <p className="conn-desc">Export candidates, logs, analytics</p>
          <button className="btn conn-btn btn-primary" onClick={() => onConnect("excel")} disabled={answers.connections.excel || submitting}>{answers.connections.excel ? "Connected" : "Connect Excel"}</button>
        </div>
      </div>
      <div className="q-nav" style={{ marginTop: "var(--space-10)" }}>
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={onComplete} disabled={submitting}>{submitting ? "Saving..." : "Complete Setup"}</button>
      </div>
    </div>
  );
}

export default App;
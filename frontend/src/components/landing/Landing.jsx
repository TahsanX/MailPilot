import {
  ArrowRight,
  CalendarCheck,
  ChatsCircle,
  EnvelopeSimple,
  GearSix,
  Lightning,
  NotePencil,
  ShieldCheck,
  Sparkle,
  Tray,
} from "@phosphor-icons/react";
import Button from "../common/Button";
import Badge from "../common/Badge";
import { FAQS } from "../../utils/constants";
import { useInView } from "../../hooks/useInView";
import TaglineReveal from "./TaglineReveal";

function Reveal({ children, className = "" }) {
  const [ref, seen] = useInView();
  return (
    <div ref={ref} className={`rise ${seen ? "rise--on" : ""} ${className}`}>
      {children}
    </div>
  );
}

const BENEFITS = [
  { icon: Lightning, title: "See what is urgent first", text: "Every email gets a priority and a purpose, so the ones that need you rise to the top." },
  { icon: NotePencil, title: "Start from a draft", text: "Urgent emails get a reply draft waiting in Gmail. You edit it and decide whether to send." },
  { icon: CalendarCheck, title: "Meetings reach your calendar", text: "When an email confirms a date and time, the event can be created for you." },
  { icon: ChatsCircle, title: "Answers from your own material", text: "Add a knowledge base and customer questions are answered from what you wrote, or handed to you." },
];

const STEPS = [
  { title: "Connect Gmail", text: "Link your inbox through a Make.com scenario that you control." },
  { title: "Configure your pipelines", text: "Tell MailPilot about your work, and add HR or customer care details if they apply." },
  { title: "Review the dashboard", text: "Check urgent mail, drafts, activity and analytics in one place." },
];

const PREVIEW_ROWS = [
  { from: "Amelia Hart", subject: "Contract revision for review", tone: "danger", label: "Urgent" },
  { from: "Billing Team", subject: "Your invoice is ready", tone: "neutral", label: "Low" },
  { from: "Daniel Okafor", subject: "Meeting request for next Tuesday", tone: "warning", label: "Medium" },
];

export default function Landing({ onStart, onLegal, onLogin }) {
  return (
    <div className="landing">
      <header className="landing__nav">
        <a className="brand" href="#top" aria-label="MailPilot home">
          <img src="/logo.svg" alt="" width="32" height="32" />
          <span>MailPilot</span>
        </a>
        <nav aria-label="Page sections" className="landing__links">
          <a href="#how-it-works">How it works</a>
          <a href="#faq">FAQ</a>
          <button type="button" className="link-btn" onClick={onLogin}>
            Log in
          </button>
        </nav>
      </header>

      <main id="main-content" tabIndex="-1">
        <section className="hero" id="top">
          <div className="hero__copy">
            <h1 className="t-h1 grad-text">Your inbox, sorted by what needs you first.</h1>
            <p className="hero__sub">
              MailPilot reads your incoming Gmail, ranks it by urgency and prepares drafts for the emails that matter. You review every draft and send it yourself.
            </p>
            <Button size="lg" iconAfter={ArrowRight} onClick={onStart}>
              Set up my inbox
            </Button>
            <p className="hero__note">Setup takes a few minutes. Gmail is only linked after you confirm it.</p>
          </div>

          <div className="hero__visual">
            <ol className="flow" aria-label="How an email moves through MailPilot">
              <li className="flow__node">
                <EnvelopeSimple size={24} aria-hidden="true" />
                <span>Gmail</span>
              </li>
              <ArrowRight className="flow__arrow" size={20} aria-hidden="true" />
              <li className="flow__node">
                <Sparkle size={24} aria-hidden="true" />
                <span>AI classification</span>
              </li>
              <ArrowRight className="flow__arrow" size={20} aria-hidden="true" />
              <li className="flow__node">
                <GearSix size={24} aria-hidden="true" />
                <span>Make.com action</span>
              </li>
            </ol>
            <div className="inbox-preview" aria-label="Example inbox preview">
              <div className="inbox-preview__head">
                <Tray size={20} aria-hidden="true" />
                <span>Inbox</span>
                <Badge>Illustrative example</Badge>
              </div>
              <ul>
                {PREVIEW_ROWS.map((r) => (
                  <li key={r.subject} className="inbox-preview__row">
                    <div>
                      <p className="inbox-preview__from">{r.from}</p>
                      <p className="inbox-preview__subject">{r.subject}</p>
                    </div>
                    <Badge tone={r.tone}>{r.label}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="section">
          <Reveal>
            <h2 className="t-h4 section__title">From a crowded inbox to a short list of actions</h2>
            <div className="split">
              <div className="card">
                <p className="card__eyebrow">Without MailPilot</p>
                <p className="t-h6">Everything arrives in one stream.</p>
                <p className="muted">Receipts, newsletters and real requests look the same until you open each one. Urgent messages wait while you sort.</p>
              </div>
              <div className="card card--accent">
                <p className="card__eyebrow">With MailPilot</p>
                <p className="t-h6">Mail arrives already sorted.</p>
                <p className="muted">Each email is labelled by purpose and priority. Urgent ones come with a draft, and the dashboard shows what is still waiting.</p>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="section" aria-labelledby="benefits-title">
          <Reveal>
            <h2 id="benefits-title" className="t-h4 section__title">What you get</h2>
            <ul className="grid-4">
              {BENEFITS.map((b) => (
                <li key={b.title} className="card">
                  <span className="icon-chip" aria-hidden="true">
                    <b.icon size={24} />
                  </span>
                  <h3 className="t-h6">{b.title}</h3>
                  <p className="muted">{b.text}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        <section className="section" id="how-it-works" aria-labelledby="how-title">
          <Reveal>
            <h2 id="how-title" className="t-h4 section__title">How it works</h2>
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li key={s.title} className="card steps__item">
                  <span className="steps__num" aria-hidden="true">{i + 1}</span>
                  <h3 className="t-h6">{s.title}</h3>
                  <p className="muted">{s.text}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </section>

        <TaglineReveal />

        <section className="section" id="faq" aria-labelledby="faq-title">
          <h2 id="faq-title" className="t-h4 section__title">Questions people ask</h2>
          <div className="faq">
            {FAQS.map((f) => (
              <details key={f.q} className="faq__item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="assurance">
            <ShieldCheck size={32} aria-hidden="true" />
            <div>
              <h2 className="t-h5">Drafts stay drafts until you send them</h2>
              <p className="muted">MailPilot does not send replies from your personal inbox, and the dashboard has no send button. You open the draft in Gmail, read it and send it when you are ready.</p>
            </div>
          </div>
        </section>

        <section className="final-cta">
          <h2 className="t-h3">Ready to see your inbox sorted?</h2>
          <Button size="lg" iconAfter={ArrowRight} onClick={onStart}>
            Set up my inbox
          </Button>
        </section>
      </main>

      <footer className="landing__footer">
        <p>MailPilot · Integrations run through Make.com and the Gemini API</p>
        <div className="landing__footer-links">
          <button type="button" className="link-btn" onClick={() => onLegal("privacy")}>Privacy</button>
          <button type="button" className="link-btn" onClick={() => onLegal("terms")}>Terms</button>
        </div>
      </footer>
    </div>
  );
}

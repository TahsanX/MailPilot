import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "@phosphor-icons/react";
import Button from "../common/Button";
import StepIndicator from "./StepIndicator";
import ProfessionStep from "./ProfessionStep";
import DepartmentStep from "./DepartmentStep";
import KnowledgeBaseStep from "./KnowledgeBaseStep";
import AccountStep from "./AccountStep";
import ReviewStep from "./ReviewStep";
import { createEmptyAccount, getSteps, hydrateConfig, normalizeConfig } from "../../utils/onboardingConfig";
import { validateAll, validateStep } from "../../utils/validation";
import { clearDraft, loadDraft, saveDraft } from "../../services/storageService";
import { signup } from "../../services/api";

/** Owns all onboarding state so values survive moving back and forth between steps. Submits once, at signup. */
export default function Onboarding({ onComplete, onExit }) {
  const draft = useRef(loadDraft());
  const [config, setConfig] = useState(() => hydrateConfig(draft.current?.config));
  const [account, setAccount] = useState(() => ({ ...createEmptyAccount(), ...draft.current?.account }));
  const [stepIndex, setStepIndex] = useState(() => Math.min(draft.current?.stepIndex ?? 0, 4));
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const heading = useRef(null);

  const steps = getSteps(config);
  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[safeIndex];
  const errors = showErrors ? validateStep(step.id, config, account) : {};
  const errorCount = Object.keys(errors).length;

  useEffect(() => {
    saveDraft({ config, account, stepIndex: safeIndex });
  }, [config, account, safeIndex]);

  useEffect(() => {
    heading.current?.focus();
  }, [step.id]);

  const update = (fn) => setConfig((c) => normalizeConfig(fn(c)));
  const updateAccount = (fn) => setAccount((a) => fn(a));

  function goTo(i) {
    setShowErrors(false);
    setSubmitError("");
    setStepIndex(i);
  }

  function next() {
    if (Object.keys(validateStep(step.id, config, account)).length) {
      setShowErrors(true);
      return;
    }
    goTo(safeIndex + 1);
  }

  async function submit() {
    const problems = validateAll(config, account);
    if (Object.keys(problems).length) {
      const badStep = steps.findIndex((s) => Object.keys(validateStep(s.id, config, account)).length);
      setSubmitError("Some answers need attention before you can create your account.");
      setStepIndex(Math.max(badStep, 0));
      setShowErrors(true);
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const files = config.knowledgeBase.documents.map((d) => d.file).filter(Boolean);
      const result = await signup({ name: account.name.trim(), email: account.email.trim(), password: account.password, profile: config, files });
      clearDraft();
      onComplete(result);
    } catch (err) {
      if (err.fields) {
        const badStep = steps.findIndex((s) => Object.keys(err.fields).some((f) => fieldBelongsToStep(s.id, f)));
        setStepIndex(Math.max(badStep, steps.length - 1));
      }
      setSubmitError(err.message || "Your account could not be created. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const isLast = step.id === "review";

  return (
    <div className="onboarding">
      <header className="onboarding__top">
        <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); onExit(); }}>
          <img src="/logo.svg" alt="" width="32" height="32" />
          <span>MailPilot</span>
        </a>
        <Button variant="ghost" size="sm" onClick={onExit}>
          Back to start
        </Button>
      </header>

      <main id="main-content" className="onboarding__card" tabIndex="-1">
        <StepIndicator steps={steps} current={safeIndex} />
        <h1 ref={heading} tabIndex="-1" className="sr-only">
          Setup step {safeIndex + 1} of {steps.length}: {step.label}
        </h1>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (isLast) submit();
            else next();
          }}
        >
          {errorCount > 0 && (
            <p className="form-summary" role="alert">
              {errorCount === 1 ? "One answer needs attention." : `${errorCount} answers need attention.`} Check the highlighted fields.
            </p>
          )}

          {step.id === "profession" && <ProfessionStep config={config} errors={errors} onChange={update} />}
          {step.id === "department" && <DepartmentStep config={config} errors={errors} onChange={update} />}
          {step.id === "knowledge" && <KnowledgeBaseStep config={config} errors={errors} onChange={update} />}
          {step.id === "account" && <AccountStep account={account} errors={errors} onChange={updateAccount} />}
          {step.id === "review" && <ReviewStep config={config} account={account} steps={steps} goTo={goTo} submitError={submitError} />}

          <div className="onboarding__nav">
            <Button variant="secondary" icon={ArrowLeft} disabled={safeIndex === 0 || submitting} onClick={() => goTo(safeIndex - 1)}>
              Back
            </Button>
            {isLast ? (
              <Button type="submit" icon={Check} loading={submitting}>
                {submitting ? "Creating account" : "Create account and open dashboard"}
              </Button>
            ) : (
              <Button type="submit" iconAfter={ArrowRight}>
                Continue
              </Button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

function fieldBelongsToStep(stepId, field) {
  if (stepId === "account") return ["name", "email", "password"].includes(field);
  if (stepId === "knowledge") return field.startsWith("knowledgeBase.") || field.startsWith("hrPreferences.") || field === "documents";
  if (stepId === "profession") return field === "profession";
  if (stepId === "department") return field === "departments" || field === "neither";
  return false;
}

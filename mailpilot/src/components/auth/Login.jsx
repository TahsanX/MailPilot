import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import Button from "../common/Button";
import Input from "../common/Input";
import { login } from "../../services/api";

export default function Login({ onSuccess, onForgotPassword, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!email.trim()) next.email = "Enter your email address.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setFormError("");
    try {
      const result = await login({ email: email.trim(), password });
      onSuccess(result);
    } catch (err) {
      setFormError(err.message || "Could not log in. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <header className="onboarding__top">
        <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); onBack(); }}>
          <img src="/logo.svg" alt="" width="32" height="32" />
          <span>MailPilot</span>
        </a>
      </header>
      <main id="main-content" className="onboarding__card auth-card" tabIndex="-1">
        <h1 className="t-h5">Log in</h1>
        <p className="muted">Opens straight to your dashboard.</p>
        <form noValidate onSubmit={handleSubmit} className="stack">
          {formError && (
            <p className="field__error" role="alert">
              {formError}
            </p>
          )}
          <Input label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
          <Input label="Password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
          <Button type="submit" loading={submitting} iconAfter={ArrowRight} fullWidth>
            Log in
          </Button>
        </form>
        <div className="auth-links">
          <button type="button" className="link-btn" onClick={onForgotPassword}>
            Forgot your password?
          </button>
          <button type="button" className="link-btn" onClick={onBack}>
            Don't have an account? Set up MailPilot
          </button>
        </div>
      </main>
    </div>
  );
}

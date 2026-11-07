import { useState } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import Button from "../common/Button";
import Input from "../common/Input";
import { forgotPassword, resetPassword } from "../../services/api";

export default function ForgotPassword({ onDone, onBack }) {
  const [stage, setStage] = useState("request"); // request | reset | done
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleRequest(e) {
    e.preventDefault();
    if (!email.trim()) return setErrors({ email: "Enter your email address." });
    setSubmitting(true);
    setFormError("");
    try {
      await forgotPassword({ email: email.trim() });
      setStage("reset");
    } catch (err) {
      setFormError(err.message || "Could not send the code. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    const next = {};
    if (!/^\d{6}$/.test(otp)) next.otp = "Enter the 6 digit code from your email.";
    if (!newPassword) next.newPassword = "Create a new password.";
    else if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) next.newPassword = "At least 8 characters, with a letter and a number.";
    if (confirmPassword !== newPassword) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setFormError("");
    try {
      await resetPassword({ email: email.trim(), otp, newPassword });
      setStage("done");
    } catch (err) {
      setFormError(err.message || "That code is incorrect or has expired.");
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
        {stage === "request" && (
          <>
            <h1 className="t-h5">Reset your password</h1>
            <p className="muted">We will email a 6 digit code to your account's email address.</p>
            <form noValidate onSubmit={handleRequest} className="stack">
              {formError && <p className="field__error" role="alert">{formError}</p>}
              <Input label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
              <Button type="submit" loading={submitting} fullWidth>
                Send reset code
              </Button>
            </form>
          </>
        )}

        {stage === "reset" && (
          <>
            <h1 className="t-h5">Enter your code</h1>
            <p className="muted">If an account exists for {email}, a code was just sent. It expires in 10 minutes.</p>
            <form noValidate onSubmit={handleReset} className="stack">
              {formError && <p className="field__error" role="alert">{formError}</p>}
              <Input label="6 digit code" inputMode="numeric" required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} error={errors.otp} />
              <Input label="New password" type="password" required autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} error={errors.newPassword} />
              <Input label="Confirm new password" type="password" required autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={errors.confirmPassword} />
              <Button type="submit" loading={submitting} fullWidth>
                Change password
              </Button>
            </form>
            <button type="button" className="link-btn" onClick={() => setStage("request")}>
              Use a different email
            </button>
          </>
        )}

        {stage === "done" && (
          <div className="stack" style={{ textAlign: "center" }}>
            <CheckCircle size={40} color="var(--color-success)" style={{ margin: "0 auto" }} />
            <h1 className="t-h5">Password changed</h1>
            <p className="muted">Log in with your new password. Any other devices have been signed out.</p>
            <Button onClick={onDone} fullWidth>
              Go to log in
            </Button>
          </div>
        )}

        {stage !== "done" && (
          <div className="auth-links">
            <button type="button" className="link-btn" onClick={onBack}>
              Back to log in
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

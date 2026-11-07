import { useEffect, useState } from "react";
import Landing from "./components/landing/Landing";
import Onboarding from "./components/onboarding/Onboarding";
import Dashboard from "./components/dashboard/Dashboard";
import Login from "./components/auth/Login";
import ForgotPassword from "./components/auth/ForgotPassword";
import LegalDialog from "./components/common/LegalDialog";
import ToastProvider from "./components/common/Toast";
import { useToast } from "./hooks/toastContext";
import { getToken, logout, me, normalizeProfile } from "./services/api";

/** Top level view state. No router: landing, login, forgot password, onboarding or dashboard. */
function Views() {
  const { notify } = useToast();
  const [session, setSession] = useState(null); // { user, profile } once logged in
  const [view, setView] = useState("landing");
  const [legal, setLegal] = useState(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    me()
      .then(({ user, profile }) => {
        setSession({ user, profile: normalizeProfile(profile) });
        setView("dashboard");
      })
      .catch(() => logout())
      .finally(() => setCheckingSession(false));
  }, []);

  function handleAuthSuccess({ user, profile }) {
    setSession({ user, profile: normalizeProfile(profile) });
    setView("dashboard");
  }

  function handleSignOut() {
    logout();
    setSession(null);
    setView("landing");
    notify("Logged out.");
  }

  if (checkingSession) return null;

  return (
    <>
      {view === "landing" && <Landing onStart={() => setView("onboarding")} onLogin={() => setView("login")} onLegal={setLegal} />}
      {view === "login" && <Login onSuccess={handleAuthSuccess} onForgotPassword={() => setView("forgot")} onBack={() => setView(session ? "dashboard" : "landing")} />}
      {view === "forgot" && <ForgotPassword onDone={() => setView("login")} onBack={() => setView("login")} />}
      {view === "onboarding" && (
        <Onboarding
          onComplete={(result) => {
            handleAuthSuccess(result);
            notify("Account created. Gmail will show as connected once Make.com confirms it.");
          }}
          onExit={() => setView(session ? "dashboard" : "landing")}
        />
      )}
      {view === "dashboard" && session && (
        <Dashboard user={session.user} profile={session.profile} onSignOut={handleSignOut} onLegal={setLegal} />
      )}
      <LegalDialog kind={legal} onClose={() => setLegal(null)} />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Views />
    </ToastProvider>
  );
}

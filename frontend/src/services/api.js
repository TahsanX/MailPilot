/**
 * All calls to the MailPilot backend live here. Components never build a URL or read the token directly.
 * The backend (not this file) is what talks to Make.com and Gemini.
 */
const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");
const AUTOMATION_BASE = (import.meta.env.VITE_AUTOMATION_URL ?? "").replace(/\/$/, "");
const TIMEOUT_MS = 20_000;
const TOKEN_KEY = "mailpilot.token";

export class ServiceError extends Error {
  constructor(message, { code, fields, status } = {}) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.fields = fields;
    this.status = status;
  }
}

/** Reading storage can throw (private browsing, blocked storage), so every access is guarded. */
export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable: the session just will not survive a reload */
  }
}
export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function request(path, { method = "GET", body, isForm = false, auth = true, query } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const url = new URL(API_BASE + path);
  if (query) Object.entries(query).forEach(([k, v]) => v != null && v !== "" && url.searchParams.set(k, v));

  const headers = {};
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch (err) {
    if (err.name === "AbortError") throw new ServiceError("The server took too long to respond.");
    throw new ServiceError("Could not reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* some successful responses (rare) may have no body */
  }

  if (!res.ok) {
    if (res.status === 401) clearToken();
    const message = json?.error?.message || `The server answered with status ${res.status}.`;
    throw new ServiceError(message, { code: json?.error?.code, fields: json?.error?.fields, status: res.status });
  }
  return json;
}

/* --------------------------------------------------------------- auth */

/** profile is the onboarding config object; files is an array of File objects (PDFs). */
export async function signup({ name, email, password, profile, files }) {
  const form = new FormData();
  form.set("name", name);
  form.set("email", email);
  form.set("password", password);
  form.set("profile", JSON.stringify(profile));
  files.forEach((f) => form.append("documents", f));
  const data = await request("/auth/signup", { method: "POST", body: form, isForm: true, auth: false });
  setToken(data.token);
  return data;
}

export async function login({ email, password }) {
  const data = await request("/auth/login", { method: "POST", body: { email, password }, auth: false });
  setToken(data.token);
  return data;
}

export const me = () => request("/auth/me");

export const forgotPassword = ({ email }) => request("/auth/forgot-password", { method: "POST", body: { email }, auth: false });

export const resetPassword = ({ email, otp, newPassword }) =>
  request("/auth/reset-password", { method: "POST", body: { email, otp, newPassword }, auth: false });

export function logout() {
  clearToken();
}

/* ---------------------------------------------------------- dashboard */

export const fetchDashboardSummary = ({ range = "30d" } = {}) =>
  request("/dashboard/summary", { query: { range, tzOffset: -new Date().getTimezoneOffset() } });

export const fetchEmailActivity = () => request("/dashboard/activity");

export const markEmailHandled = (emailId) => request(`/dashboard/emails/${encodeURIComponent(emailId)}/handled`, { method: "POST", body: {} });

export const fetchCandidates = ({ range = "all" } = {}) => request("/dashboard/candidates", { query: { range } });

export const fetchCustomerCareStats = ({ range = "30d" } = {}) => request("/dashboard/care", { query: { range } });

export const loadSampleData = () => request("/dashboard/sample-data", { method: "POST", body: {} });

export const clearSampleData = () => request("/dashboard/sample-data", { method: "DELETE" });

/* ------------------------------------------------------------ integrations */

export const automationConfigured = () => Boolean(AUTOMATION_BASE);

export const fetchIntegrationStatus = () => request("/integrations/status");

export const requestTelegramLinkCode = () => request("/integrations/telegram/link-code", { method: "POST", body: {} });

/** Opens Google's consent screen in a new tab. The automation service redirects back there, not here. */
export function gmailConnectUrl(userId) {
  return `${AUTOMATION_BASE}/api/gmail_oauth_start?userId=${encodeURIComponent(userId)}`;
}

/**
 * The export endpoint lives on the automation service and needs the same bearer token, so it
 * can't just be an <a href>: the file is fetched here and handed to the browser as a blob download.
 */
export async function downloadExcelReport() {
  const token = getToken();
  const res = await fetch(`${AUTOMATION_BASE}/api/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ServiceError("Could not generate the report. Try again.");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mailpilot-report.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Converts the backend's profile shape (documents carry a Gemini summary status) into the shape
 * the onboarding and dashboard components already use.
 */
export function normalizeProfile(profile) {
  if (!profile) return profile;
  return {
    ...profile,
    knowledgeBase: {
      ...profile.knowledgeBase,
      documents: profile.knowledgeBase.documents.map((d) => ({
        id: d.id,
        name: d.name,
        size: d.size,
        status: d.summaryStatus === "done" ? "uploaded" : d.summaryStatus === "failed" ? "failed" : "processing",
        summary: d.summary,
        summaryError: d.summaryError,
      })),
    },
  };
}

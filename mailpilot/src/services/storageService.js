/**
 * Keeps the in-progress onboarding form across a reload, until the account is created.
 * Nothing sensitive (passwords, PDF contents) is ever stored here.
 */
const DRAFT_KEY = "mailpilot.onboarding.draft.v3";

function read(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

/** File objects cannot be serialised, so only metadata is kept; the user re-selects the file after a reload. */
function stripFiles(config) {
  return {
    ...config,
    knowledgeBase: {
      ...config.knowledgeBase,
      documents: config.knowledgeBase.documents.map((d) => ({ id: d.id, name: d.name, size: d.size, status: "needs_reselect" })),
    },
  };
}

export const loadDraft = () => read(DRAFT_KEY);
export const saveDraft = (draft) => write(DRAFT_KEY, { ...draft, config: stripFiles(draft.config), account: { name: draft.account?.name ?? "", email: draft.account?.email ?? "" } });
export const clearDraft = () => remove(DRAFT_KEY);

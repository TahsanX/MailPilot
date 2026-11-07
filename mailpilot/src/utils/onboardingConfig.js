/** Shape follows section 7 of the design guide. `neither` is a UI only flag and is removed from API payloads. */
export function createEmptyConfig() {
  return {
    profession: "",
    departments: [],
    neither: false,
    knowledgeBase: {
      companyName: "",
      companyOverview: "",
      faqs: [{ question: "", answer: "" }],
      documents: [],
    },
    hrPreferences: { enabled: false, targetRole: "", jobDescription: "" },
    customerCarePreferences: { enabled: false, serviceContext: "", responseTone: "professional" },
  };
}

/** Keeps dependent fields consistent after every change. */
export function normalizeConfig(config) {
  let { departments, neither } = config;
  if (config.profession !== "private_service_holder") {
    departments = [];
    neither = false;
  } else if (neither) {
    departments = [];
  }
  return {
    ...config,
    departments,
    neither,
    hrPreferences: { ...config.hrPreferences, enabled: departments.includes("hr") },
    customerCarePreferences: { ...config.customerCarePreferences, enabled: departments.includes("customer_care") },
  };
}

/** Merges a stored (possibly older or partial) config over the defaults. */
export function hydrateConfig(stored) {
  const base = createEmptyConfig();
  if (!stored || typeof stored !== "object") return base;
  const kb = stored.knowledgeBase ?? {};
  return normalizeConfig({
    ...base,
    ...stored,
    departments: Array.isArray(stored.departments) ? stored.departments : [],
    knowledgeBase: {
      ...base.knowledgeBase,
      ...kb,
      faqs: Array.isArray(kb.faqs) && kb.faqs.length ? kb.faqs : base.knowledgeBase.faqs,
      documents: (Array.isArray(kb.documents) ? kb.documents : []).map((d) => (d.file ? d : { ...d, status: "needs_reselect" })),
    },
    hrPreferences: { ...base.hrPreferences, ...stored.hrPreferences },
    customerCarePreferences: { ...base.customerCarePreferences, ...stored.customerCarePreferences },
  });
}

export function getSteps(config) {
  const steps = [{ id: "profession", label: "Profession" }];
  if (config.profession === "private_service_holder") steps.push({ id: "department", label: "Department" });
  steps.push({ id: "knowledge", label: "Knowledge base" }, { id: "account", label: "Account" }, { id: "review", label: "Review" });
  return steps;
}

export function createEmptyAccount() {
  return { name: "", email: "", password: "", confirmPassword: "" };
}

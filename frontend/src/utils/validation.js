/** Pure validation for the onboarding form. Returns { fieldKey: message }. */

export function getFlags(config) {
  return {
    isPrivateService: config.profession === "private_service_holder",
    hr: config.departments.includes("hr"),
    care: config.departments.includes("customer_care"),
  };
}

export function validateProfession(config) {
  const errors = {};
  if (!config.profession) errors.profession = "Choose the option that best describes you.";
  return errors;
}

export function validateDepartment(config) {
  const errors = {};
  if (config.departments.length === 0 && !config.neither) {
    errors.departments = "Select at least one option, or choose Neither of them.";
  }
  return errors;
}

export function validateKnowledgeBase(config) {
  const errors = {};
  const { hr, care } = getFlags(config);
  const kb = config.knowledgeBase;

  if (hr || care) {
    if (!kb.companyName.trim()) errors.companyName = "Enter your company name.";
    if (!kb.companyOverview.trim()) errors.companyOverview = "Add a short description of the company, products or services.";
  }

  const faqErrors = {};
  kb.faqs.forEach((faq, i) => {
    const hasQ = faq.question.trim();
    const hasA = faq.answer.trim();
    if (hasQ && !hasA) faqErrors[i] = { answer: "Add an answer for this question." };
    if (!hasQ && hasA) faqErrors[i] = { question: "Add the question this answer belongs to." };
  });
  if (Object.keys(faqErrors).length) errors.faqs = faqErrors;

  if (hr && !config.hrPreferences.targetRole.trim()) {
    errors.targetRole = "Enter the role you are hiring for.";
  }
  return errors;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAccount(account) {
  const errors = {};
  const name = account.name.trim();
  if (!name) errors.name = "Enter your name.";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters.";
  else if (name.length > 60) errors.name = "Name must be 60 characters or fewer.";

  const email = account.email.trim();
  if (!email) errors.email = "Enter your email address.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";

  if (!account.password) errors.password = "Create a password.";
  else if (account.password.length < 8) errors.password = "Password must be at least 8 characters.";
  else if (!/[A-Za-z]/.test(account.password) || !/\d/.test(account.password)) errors.password = "Password must contain at least one letter and one number.";

  if (!account.confirmPassword) errors.confirmPassword = "Re-enter your password.";
  else if (account.password && account.confirmPassword !== account.password) errors.confirmPassword = "Passwords do not match.";

  return errors;
}

export function validateStep(stepId, config, account) {
  switch (stepId) {
    case "profession":
      return validateProfession(config);
    case "department":
      return validateDepartment(config);
    case "knowledge":
      return validateKnowledgeBase(config);
    case "account":
      return validateAccount(account ?? {});
    default:
      return {};
  }
}

export function validateAll(config, account) {
  const { isPrivateService } = getFlags(config);
  return {
    ...validateProfession(config),
    ...(isPrivateService ? validateDepartment(config) : {}),
    ...validateKnowledgeBase(config),
    ...validateAccount(account ?? {}),
  };
}

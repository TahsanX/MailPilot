import Input from "../common/Input";

export default function CompanyInfoForm({ knowledgeBase, errors, onChange }) {
  const set = (field) => (e) => onChange((c) => ({ ...c, knowledgeBase: { ...c.knowledgeBase, [field]: e.target.value } }));
  return (
    <div className="form-group">
      <h3 className="t-h6">Company information</h3>
      <Input label="Company name" required value={knowledgeBase.companyName} onChange={set("companyName")} error={errors.companyName} autoComplete="organization" />
      <Input
        label="About the company, products or services"
        required
        multiline
        rows={4}
        value={knowledgeBase.companyOverview}
        onChange={set("companyOverview")}
        error={errors.companyOverview}
        hint="A few sentences are enough. The assistant uses this as background."
      />
    </div>
  );
}

import Input from "../common/Input";
import Select from "../common/Select";
import { RESPONSE_TONES } from "../../utils/constants";

export function HRPreferences({ prefs, errors, onChange }) {
  const set = (field) => (e) => onChange((c) => ({ ...c, hrPreferences: { ...c.hrPreferences, [field]: e.target.value } }));
  return (
    <div className="form-group">
      <h3 className="t-h6">HR preferences</h3>
      <Input label="Target role or position" required value={prefs.targetRole} onChange={set("targetRole")} error={errors.targetRole} />
      <Input
        label="Job description or hiring criteria"
        multiline
        rows={4}
        value={prefs.jobDescription}
        onChange={set("jobDescription")}
        hint="Optional. Used to compare each CV against what you are looking for."
      />
    </div>
  );
}

export function CustomerCarePreferences({ prefs, onChange }) {
  const set = (field) => (e) => onChange((c) => ({ ...c, customerCarePreferences: { ...c.customerCarePreferences, [field]: e.target.value } }));
  return (
    <div className="form-group">
      <h3 className="t-h6">Customer Service preferences</h3>
      <Input label="Service or product context" multiline rows={3} value={prefs.serviceContext} onChange={set("serviceContext")} hint="Optional. What do customers usually write to you about?" />
      <Select label="Response tone" options={RESPONSE_TONES} value={prefs.responseTone} onChange={set("responseTone")} />
    </div>
  );
}

export default HRPreferences;

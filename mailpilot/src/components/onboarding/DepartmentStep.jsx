import Checkbox from "../common/Checkbox";
import { DEPARTMENTS } from "../../utils/constants";

export default function DepartmentStep({ config, errors, onChange }) {
  function toggle(value) {
    onChange((c) => {
      const has = c.departments.includes(value);
      return { ...c, neither: false, departments: has ? c.departments.filter((d) => d !== value) : [...c.departments, value] };
    });
  }

  return (
    <fieldset className="fieldset" aria-describedby={errors.departments ? "department-error" : undefined}>
      <legend className="t-h5">Do you work with?</legend>
      <p className="muted">Choose all that apply. HR and Customer Service can be selected together.</p>
      <div className="choices">
        {DEPARTMENTS.map((d) => (
          <Checkbox key={d.value} label={d.label} description={d.description} checked={config.departments.includes(d.value)} onChange={() => toggle(d.value)} />
        ))}
        <Checkbox
          label="Neither of them"
          description="Only the General pipeline runs. Selecting this clears the options above."
          checked={config.neither}
          onChange={(e) => onChange((c) => ({ ...c, neither: e.target.checked, departments: [] }))}
        />
      </div>
      {errors.departments && (
        <p id="department-error" className="field__error" role="alert">
          {errors.departments}
        </p>
      )}
    </fieldset>
  );
}

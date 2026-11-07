import Checkbox from "../common/Checkbox";
import { PROFESSIONS } from "../../utils/constants";

export default function ProfessionStep({ config, errors, onChange }) {
  return (
    <fieldset className="fieldset" aria-describedby={errors.profession ? "profession-error" : undefined}>
      <legend className="t-h5">What's your profession?</legend>
      <p className="muted">This decides which questions come next.</p>
      <div className="choices">
        {PROFESSIONS.map((p) => (
          <Checkbox
            key={p.value}
            type="radio"
            name="profession"
            label={p.label}
            description={p.description}
            checked={config.profession === p.value}
            onChange={() => onChange((c) => ({ ...c, profession: p.value }))}
          />
        ))}
      </div>
      {errors.profession && (
        <p id="profession-error" className="field__error" role="alert">
          {errors.profession}
        </p>
      )}
    </fieldset>
  );
}

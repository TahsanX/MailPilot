import { Check } from "@phosphor-icons/react";

/** Card style choice. Works as a checkbox or a radio. The native input stays in the DOM for keyboard and screen readers. */
export default function Checkbox({ type = "checkbox", name, label, description, checked, onChange, disabled = false }) {
  return (
    <label className={`choice ${checked ? "choice--checked" : ""} ${disabled ? "choice--disabled" : ""}`}>
      <input type={type} name={name} checked={checked} onChange={onChange} disabled={disabled} className="choice__input" />
      <span className={`choice__mark choice__mark--${type}`} aria-hidden="true">
        {checked && <Check size={14} weight="bold" />}
      </span>
      <span className="choice__text">
        <span className="choice__label">{label}</span>
        {description && <span className="choice__desc">{description}</span>}
      </span>
    </label>
  );
}

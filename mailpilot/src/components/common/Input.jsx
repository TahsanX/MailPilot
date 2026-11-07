import { useId } from "react";

/** Labelled text input or textarea with hint and error wired up for assistive tech. */
export default function Input({ label, hint, error, multiline = false, rows = 3, required = false, className = "", ...rest }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const Tag = multiline ? "textarea" : "input";
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {required ? <span className="field__req"> (required)</span> : null}
      </label>
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      <Tag
        id={id}
        className={`control ${error ? "control--error" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        rows={multiline ? rows : undefined}
        {...rest}
      />
      {error && (
        <p id={errorId} className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

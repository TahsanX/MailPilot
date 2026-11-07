import { Check } from "@phosphor-icons/react";

export default function StepIndicator({ steps, current }) {
  return (
    <nav aria-label="Setup progress">
      <ol className="stepper">
        {steps.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li key={s.id} className={`stepper__item stepper__item--${state}`} aria-current={state === "current" ? "step" : undefined}>
              <span className="stepper__dot" aria-hidden="true">
                {state === "done" ? <Check size={14} weight="bold" /> : i + 1}
              </span>
              <span className="stepper__label">
                {s.label}
                <span className="sr-only">{state === "done" ? " (completed)" : state === "current" ? " (current step)" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

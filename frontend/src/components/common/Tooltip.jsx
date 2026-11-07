import { useId } from "react";
import { Info } from "@phosphor-icons/react";

/** Info button that reveals a definition on hover and on keyboard or touch focus. */
export default function Tooltip({ text, label = "Definition" }) {
  const id = useId();
  return (
    <span className="tip">
      <button type="button" className="tip__btn" aria-label={label} aria-describedby={id}>
        <Info size={16} aria-hidden="true" />
      </button>
      <span role="tooltip" id={id} className="tip__bubble">
        {text}
      </span>
    </span>
  );
}

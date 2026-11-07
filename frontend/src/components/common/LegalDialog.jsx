import { useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";
import Button from "./Button";

const CONTENT = {
  privacy: {
    title: "Privacy",
    body: [
      "Draft placeholder. This is not a final privacy policy.",
      "In this prototype, your setup answers are kept in your browser storage on this device. Uploaded PDF files are not stored by the dashboard.",
      "When the Make.com integration is connected, the information you provide will be sent to your own Make.com scenarios. A final policy must describe exactly what is sent, where it is stored and how it can be deleted.",
    ],
  },
  terms: {
    title: "Terms",
    body: [
      "Draft placeholder. These are not final terms of service.",
      "MailPilot prepares drafts and organises email. It does not send replies from your personal inbox. You are responsible for reviewing every draft before you send it.",
      "Final terms must be written and reviewed before MailPilot is offered to other people.",
    ],
  },
};

export default function LegalDialog({ kind, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (kind && dialog && !dialog.open) dialog.showModal();
    if (!kind && dialog?.open) dialog.close();
  }, [kind]);

  const doc = kind ? CONTENT[kind] : null;
  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby="legal-title">
      {doc && (
        <>
          <div className="dialog__head">
            <h2 id="legal-title" className="t-h5">
              {doc.title}
            </h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="dialog__body">
            {doc.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      )}
    </dialog>
  );
}

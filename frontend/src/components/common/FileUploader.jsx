import { useId, useRef, useState } from "react";
import { FilePdf, UploadSimple, X } from "@phosphor-icons/react";
import { MAX_PDF_FILES, MAX_PDF_MB } from "../../utils/constants";
import { formatFileSize } from "../../utils/formatters";

const STATUS_TEXT = {
  selected: "Ready to upload. Not yet available to the assistant.",
  needs_reselect: "Select this file again. Files are not kept between visits.",
};

export default function FileUploader({ files, onAdd, onRemove }) {
  const id = useId();
  const input = useRef(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  function handle(list) {
    const incoming = Array.from(list);
    const problems = [];
    let count = files.length;
    for (const file of incoming) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) problems.push(`${file.name} is not a PDF.`);
      else if (file.size > MAX_PDF_MB * 1024 * 1024) problems.push(`${file.name} is larger than ${MAX_PDF_MB} MB.`);
      else if (count >= MAX_PDF_FILES) problems.push(`You can add up to ${MAX_PDF_FILES} files.`);
      else {
        onAdd(file);
        count += 1;
      }
    }
    setError([...new Set(problems)].join(" "));
    if (input.current) input.current.value = "";
  }

  return (
    <div className="uploader">
      <p className="field__label" id={`${id}-label`}>
        PDF documents <span className="field__opt">(optional)</span>
      </p>
      <p className="field__hint">
        Policies, product sheets or price lists. The assistant can use them to answer from your own information. PDF only, up to {MAX_PDF_MB} MB each.
      </p>
      <div
        className={`dropzone ${dragging ? "dropzone--active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files);
        }}
      >
        <UploadSimple size={24} aria-hidden="true" />
        <p>Drag a PDF here or</p>
        <label htmlFor={id} className="btn btn--secondary btn--sm">
          <span>Choose files</span>
        </label>
        <input ref={input} id={id} type="file" accept="application/pdf,.pdf" multiple className="sr-only-focusable" onChange={(e) => handle(e.target.files)} aria-describedby={`${id}-label`} />
      </div>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
      {files.length === 0 ? (
        <p className="uploader__empty">No documents added yet. You can skip this.</p>
      ) : (
        <ul className="filelist">
          {files.map((f) => (
            <li key={f.id} className="filelist__item">
              <FilePdf size={24} aria-hidden="true" />
              <div className="filelist__meta">
                <p className="filelist__name">{f.name}</p>
                <p className="filelist__sub">
                  {formatFileSize(f.size)} · {STATUS_TEXT[f.status] ?? STATUS_TEXT.selected}
                </p>
              </div>
              <button type="button" className="icon-btn" onClick={() => onRemove(f.id)} aria-label={`Remove ${f.name}`}>
                <X size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

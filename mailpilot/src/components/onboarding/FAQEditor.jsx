import { Plus, Trash } from "@phosphor-icons/react";
import Button from "../common/Button";
import Input from "../common/Input";

export default function FAQEditor({ faqs, errors = {}, onChange }) {
  const update = (i, field, value) => onChange(faqs.map((f, idx) => (idx === i ? { ...f, [field]: value } : f)));
  const remove = (i) => onChange(faqs.length === 1 ? [{ question: "", answer: "" }] : faqs.filter((_, idx) => idx !== i));

  return (
    <div className="form-group">
      <h3 className="t-h6">Frequently asked questions</h3>
      <p className="muted">Add the questions you answer most often. Each question needs an answer.</p>
      <ul className="faq-editor">
        {faqs.map((faq, i) => (
          <li key={i} className="faq-editor__item">
            <div className="faq-editor__head">
              <span className="faq-editor__num">Question {i + 1}</span>
              <button type="button" className="icon-btn" onClick={() => remove(i)} aria-label={`Remove question ${i + 1}`}>
                <Trash size={18} aria-hidden="true" />
              </button>
            </div>
            <Input label="Question" value={faq.question} onChange={(e) => update(i, "question", e.target.value)} error={errors[i]?.question} />
            <Input label="Answer" multiline rows={3} value={faq.answer} onChange={(e) => update(i, "answer", e.target.value)} error={errors[i]?.answer} />
          </li>
        ))}
      </ul>
      <Button variant="secondary" icon={Plus} onClick={() => onChange([...faqs, { question: "", answer: "" }])}>
        Add another question
      </Button>
    </div>
  );
}

import FileUploader from "../common/FileUploader";
import CompanyInfoForm from "./CompanyInfoForm";
import FAQEditor from "./FAQEditor";
import { HRPreferences, CustomerCarePreferences } from "./HRPreferences";
import { getFlags } from "../../utils/validation";

export default function KnowledgeBaseStep({ config, errors, onChange }) {
  const { hr, care } = getFlags(config);
  const kb = config.knowledgeBase;
  const needsCompany = hr || care;

  const addDoc = (file) =>
    onChange((c) => ({
      ...c,
      knowledgeBase: {
        ...c.knowledgeBase,
        documents: [...c.knowledgeBase.documents, { id: crypto.randomUUID(), name: file.name, size: file.size, status: "selected", file }],
      },
    }));
  const removeDoc = (id) => onChange((c) => ({ ...c, knowledgeBase: { ...c.knowledgeBase, documents: c.knowledgeBase.documents.filter((d) => d.id !== id) } }));

  return (
    <div className="stack">
      <div>
        <h2 className="t-h5">Knowledge base</h2>
        <p className="muted">
          {needsCompany
            ? "Because you selected HR or Customer Service, MailPilot needs some information about your company. Documents are optional."
            : "Optional. Add documents if you want the assistant to answer using your own information. You can skip this step."}
        </p>
      </div>

      {needsCompany && (
        <>
          <CompanyInfoForm knowledgeBase={kb} errors={errors} onChange={onChange} />
          <FAQEditor faqs={kb.faqs} errors={errors.faqs} onChange={(faqs) => onChange((c) => ({ ...c, knowledgeBase: { ...c.knowledgeBase, faqs } }))} />
        </>
      )}

      <FileUploader files={kb.documents} onAdd={addDoc} onRemove={removeDoc} />

      {hr && <HRPreferences prefs={config.hrPreferences} errors={errors} onChange={onChange} />}
      {care && <CustomerCarePreferences prefs={config.customerCarePreferences} onChange={onChange} />}
    </div>
  );
}

import Input from "../common/Input";

export default function AccountStep({ account, errors, onChange }) {
  const set = (field) => (e) => onChange((a) => ({ ...a, [field]: e.target.value }));
  return (
    <div className="stack">
      <div>
        <h2 className="t-h5">Create your account</h2>
        <p className="muted">This is how you will log in next time. Your name and the knowledge base you added are saved with it.</p>
      </div>
      <Input label="Your name" required autoComplete="name" value={account.name} onChange={set("name")} error={errors.name} />
      <Input label="Email" required type="email" autoComplete="email" value={account.email} onChange={set("email")} error={errors.email} hint="Used to log in and to send you a password reset code if you ever need one." />
      <Input
        label="Password"
        required
        type="password"
        autoComplete="new-password"
        value={account.password}
        onChange={set("password")}
        error={errors.password}
        hint="At least 8 characters, with a letter and a number."
      />
      <Input label="Confirm password" required type="password" autoComplete="new-password" value={account.confirmPassword} onChange={set("confirmPassword")} error={errors.confirmPassword} />
    </div>
  );
}

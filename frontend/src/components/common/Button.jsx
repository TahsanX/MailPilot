import { CircleNotch } from "@phosphor-icons/react";

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon,
  iconAfter: IconAfter,
  fullWidth = false,
  type = "button",
  className = "",
  children,
  ...rest
}) {
  const cls = ["btn", `btn--${variant}`, `btn--${size}`, fullWidth && "btn--full", className].filter(Boolean).join(" ");
  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <CircleNotch className="spin" size={18} aria-hidden="true" /> : Icon && <Icon size={18} aria-hidden="true" />}
      <span>{children}</span>
      {IconAfter && !loading && <IconAfter size={18} aria-hidden="true" />}
    </button>
  );
}

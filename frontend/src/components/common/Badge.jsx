export default function Badge({ tone = "neutral", icon: Icon, children }) {
  return (
    <span className={`badge badge--${tone}`}>
      {Icon && <Icon size={14} weight="bold" aria-hidden="true" />}
      {children}
    </span>
  );
}

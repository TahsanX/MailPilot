import { ChartBar, EnvelopeSimple, Gear, Headset, SquaresFour, Users } from "@phosphor-icons/react";

const ICONS = { SquaresFour, EnvelopeSimple, ChartBar, Users, Headset, Gear };

export function NavList({ items, active, onNavigate }) {
  return (
    <ul className="nav__list">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const isActive = item.id === active;
        return (
          <li key={item.id}>
            <button
              type="button"
              className={`nav__item ${isActive ? "nav__item--active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
              title={item.label}
            >
              <Icon size={20} weight={isActive ? "fill" : "regular"} aria-hidden="true" />
              <span className="nav__label">{item.short ?? item.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function Sidebar({ items, active, onNavigate, onLegal }) {
  return (
    <aside className="sidebar">
      <a className="brand sidebar__brand" href="#top" onClick={(e) => e.preventDefault()} aria-label="MailPilot">
        <img src="/logo.svg" alt="" width="32" height="32" />
        <span className="sidebar__brand-text">MailPilot</span>
      </a>
      <nav aria-label="Dashboard">
        <NavList items={items} active={active} onNavigate={onNavigate} />
      </nav>
      <div className="sidebar__foot">
        <button type="button" className="link-btn" onClick={() => onLegal("privacy")}>Privacy</button>
        <button type="button" className="link-btn" onClick={() => onLegal("terms")}>Terms</button>
      </div>
    </aside>
  );
}

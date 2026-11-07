import { useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";
import { NavList } from "./Sidebar";

export default function MobileNavigation({ open, onClose, items, active, onNavigate }) {
  const closeBtn = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    closeBtn.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className={`drawer ${open ? "drawer--open" : ""}`} aria-hidden={!open}>
      <div className="drawer__backdrop" onClick={onClose} />
      <div className="drawer__panel" role="dialog" aria-modal="true" aria-label="Navigation" inert={!open}>
        <div className="drawer__head">
          <span className="brand">
            <img src="/logo.svg" alt="" width="32" height="32" />
            <span>MailPilot</span>
          </span>
          <button ref={closeBtn} type="button" className="icon-btn" onClick={onClose} aria-label="Close menu">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Dashboard">
          <NavList
            items={items}
            active={active}
            onNavigate={(id) => {
              onNavigate(id);
              onClose();
            }}
          />
        </nav>
      </div>
    </div>
  );
}

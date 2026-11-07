import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileNavigation from "./MobileNavigation";

export default function AppShell({ items, active, onNavigate, onLegal, topbar, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="shell">
      <Sidebar items={items} active={active} onNavigate={onNavigate} onLegal={onLegal} />
      <div className="shell__main">
        <Topbar {...topbar} onOpenMenu={() => setMenuOpen(true)} />
        <main id="main-content" className="content" tabIndex="-1">
          {children}
        </main>
      </div>
      <MobileNavigation open={menuOpen} onClose={() => setMenuOpen(false)} items={items} active={active} onNavigate={onNavigate} />
    </div>
  );
}

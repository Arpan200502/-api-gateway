import { LayoutDashboard, KeyRound, RefreshCcw, Shield, Workflow } from "lucide-react";
import { NavLink } from "react-router-dom";
import Button from "../ui/Button";

const sidebarItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Gateways", icon: Workflow, path: "/dashboard" },
  { label: "Security", icon: Shield, path: "/dashboard" },
  { label: "Keys", icon: KeyRound, path: "/dashboard" }
];

export default function AppShell({ title, subtitle, onRefresh, onLogout, children, navItems }) {
  const links = Array.isArray(navItems) && navItems.length ? navItems : sidebarItems;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Obsidian Gateway</p>
          <h2>Control Center</h2>
        </div>
        <nav>
          {links.map(({ label, icon: Icon, path }) => (
            <NavLink
              to={path}
              key={`${label}-${path}`}
              className={({ isActive }) => `side-item side-link ${isActive ? "active" : ""}`}
              end={path === "/dashboard"}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <p className="sidebar-note">
          Similar to hyperscale cloud consoles, this panel is intentionally dense and operational.
        </p>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div>
            <p className="muted">Workspace</p>
            <h1>{title}</h1>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
          <div className="topbar-actions">
            <Button variant="ghost" onClick={onRefresh}>
              <RefreshCcw size={14} /> Refresh
            </Button>
            <Button variant="danger" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </header>

        <section className="content-area">{children}</section>
      </div>
    </div>
  );
}

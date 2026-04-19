import { Link } from "react-router-dom";

export default function AuthShell({ title, subtitle, children, switchText, switchLink, switchCta }) {
  return (
    <div className="auth-page">
      <aside className="auth-brand-panel">
        <p className="eyebrow">Obsidian Gateway</p>
        <h1>Security-first API control plane</h1>
        <p>
          Ship your APIs behind smart routing, cache, rate limits, and live observability.
        </p>
      </aside>
      <main className="auth-main-panel">
        <div className="auth-card">
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
          {children}
          <p className="auth-switch">
            {switchText} <Link to={switchLink}>{switchCta}</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

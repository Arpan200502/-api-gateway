import { ArrowRight, ShieldCheck, Workflow } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div>
          <p className="eyebrow">Obsidian Gateway</p>
        </div>
        <div className="landing-actions">
          <Link to="/login" className="btn btn-ghost">
            Login
          </Link>
          <Link to="/signup" className="btn btn-primary">
            Start Free <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <section className="hero">
        <div>
          <h1>Obsidian Gateway</h1>
          <p>
            Production-grade API gateway workspace with route controls, high-fidelity logs, and
            real-time observability built for modern SaaS products.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-primary">
              Create Workspace
            </Link>
            <Link to="/login" className="btn btn-ghost">
              Enter Console
            </Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-stat">
            <Workflow size={16} />
            <span>Route-aware orchestration</span>
          </div>
          <div className="hero-stat">
            <ShieldCheck size={16} />
            <span>JWT, API key, and rate controls</span>
          </div>
          <div className="hero-stat">
            <span className="dot" />
            <span>Live request analytics dashboard</span>
          </div>
        </div>
      </section>
    </div>
  );
}

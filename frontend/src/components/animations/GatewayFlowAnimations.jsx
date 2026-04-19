import "../../styles/gateway-flow-animations.css";
import { Globe2, Scale, Server, Shield, Users } from "lucide-react";

function UserIcon() {
  return (
    <div className="gfa-icon gfa-icon-user">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21a8 8 0 1 0-16 0" />
        <circle cx="12" cy="8" r="4" />
      </svg>
    </div>
  );
}

function InternetIcon() {
  return (
    <div className="gfa-icon gfa-icon-internet">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18" />
        <path d="M12 3a14 14 0 0 0 0 18" />
      </svg>
    </div>
  );
}

function ObsidiaIcon() {
  return (
    <div className="gfa-icon gfa-icon-obsidian">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l8 4v10l-8 4-8-4V7l8-4z" />
        <path d="M8 10h8" />
        <path d="M8 14h8" />
      </svg>
    </div>
  );
}

function ServerBlockIcon({ label }) {
  return (
    <div className="gfa-server-block">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="gfa-server-icon">
        <rect x="3" y="4" width="18" height="6" rx="1.5" />
        <rect x="3" y="14" width="18" height="6" rx="1.5" />
        <circle cx="7" cy="7" r="0.8" fill="currentColor" />
        <circle cx="7" cy="17" r="0.8" fill="currentColor" />
      </svg>
      <span className="gfa-server-label">{label}</span>
    </div>
  );
}

export function LoadBalancingAnimation() {
  return (
    <div className="gfa-root gfa-lb-map-root">
      <div className="gfa-lb-map-frame">
        <div className="gfa-lb-map-stage">
          <div className="gfa-lb-path gfa-path-red gfa-h-1" />
          <div className="gfa-lb-path gfa-path-blue gfa-h-2" />
          <div className="gfa-lb-path gfa-path-green gfa-h-3" />
          <div className="gfa-lb-path gfa-path-pink gfa-h-4" />
          <div className="gfa-lb-path gfa-path-purple gfa-h-5" />
          <div className="gfa-lb-path gfa-path-red gfa-h-6" />

          <div className="gfa-lb-elbow gfa-path-yellow gfa-elbow-left-top" />
          <div className="gfa-lb-elbow gfa-path-cyan gfa-elbow-left-bottom" />
          <div className="gfa-lb-elbow gfa-path-yellow gfa-elbow-right-top" />
          <div className="gfa-lb-elbow gfa-path-green gfa-elbow-right-top-alt" />
          <div className="gfa-lb-elbow gfa-path-cyan gfa-elbow-right-bottom" />
          <div className="gfa-lb-elbow gfa-path-blue gfa-elbow-right-bottom-alt" />

          <div className="gfa-line-pulse gfa-line-pulse-top" />
          <div className="gfa-line-pulse gfa-line-pulse-mid" />
          <div className="gfa-line-pulse gfa-line-pulse-bot" />

          <div className="gfa-lb-card c-user-1">
            <div className="gfa-lb-icon i-red"><Users size={14} /></div>
            <strong>Users</strong>
            <span><i />Active</span>
          </div>

          <div className="gfa-lb-card c-user-2">
            <div className="gfa-lb-icon i-yellow"><Users size={14} /></div>
            <strong>Users</strong>
            <span><i />Active</span>
          </div>

          <div className="gfa-lb-card c-user-3">
            <div className="gfa-lb-icon i-blue"><Users size={14} /></div>
            <strong>Users</strong>
            <span><i />Active</span>
          </div>

          <div className="gfa-lb-card c-user-4">
            <div className="gfa-lb-icon i-green"><Users size={14} /></div>
            <strong>Users</strong>
            <span><i />Active</span>
          </div>

          <div className="gfa-lb-card c-user-5">
            <div className="gfa-lb-icon i-cyan"><Users size={14} /></div>
            <strong>User / Client</strong>
            <span><i />Active</span>
          </div>

          <div className="gfa-lb-card c-frontend">
            <div className="gfa-lb-icon i-pink"><Globe2 size={14} /></div>
            <strong>Your Frontend</strong>
            <span><i />Active</span>
          </div>

          <div className="gfa-lb-card c-gateway">
            <div className="gfa-lb-icon i-purple"><Shield size={14} /></div>
            <strong>Obsidian Gateway</strong>
            <span><i />Active</span>
          </div>

          <div className="gfa-lb-card c-balancer">
            <div className="gfa-lb-icon i-amber"><Scale size={14} /></div>
            <strong>Obsidian Load Balancer</strong>
            <span><i />Active</span>
          </div>

          <div className="gfa-lb-card c-server-1">
            <div className="gfa-lb-icon i-violet"><Server size={14} /></div>
            <strong>Backend Server 1 (Same code)</strong>
            <span><i />Active</span>
          </div>

          <div className="gfa-lb-card c-server-2">
            <div className="gfa-lb-icon i-violet"><Server size={14} /></div>
            <strong>Backend Server 2 (Same code)</strong>
            <span><i />Active</span>
          </div>

          <div className="gfa-lb-card c-server-3">
            <div className="gfa-lb-icon i-violet"><Server size={14} /></div>
            <strong>Backend Server 3 (Same code)</strong>
            <span><i />Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CachingAnimation() {
  return (
    <div className="gfa-root">
      <div className="gfa-cache-container">
        <div className="gfa-cache-scenario">
          <span className="gfa-scenario-label gfa-label-miss">MISS</span>
          <div className="gfa-cache-flow">
            <div className="gfa-node gfa-node-sm">
              <UserIcon />
              <span className="gfa-node-label-sm">Frontend</span>
            </div>

            <div className="gfa-connection gfa-conn-sm">
              <svg className="gfa-line-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
                <line x1="0" y1="20" x2="100" y2="20" className="gfa-line gfa-line-miss" />
              </svg>
              <div className="gfa-pulse gfa-pulse-miss-1" />
            </div>

            <div className="gfa-node gfa-node-sm">
              <ObsidiaIcon />
              <span className="gfa-node-label-sm">Obsidian</span>
            </div>

            <div className="gfa-connection gfa-conn-sm">
              <svg className="gfa-line-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
                <line x1="0" y1="20" x2="100" y2="20" className="gfa-line gfa-line-miss" />
              </svg>
              <div className="gfa-pulse gfa-pulse-miss-2" />
            </div>

            <div className="gfa-node gfa-node-sm">
              <ServerBlockIcon label="Server" />
              <span className="gfa-node-label-sm">Server</span>
            </div>
          </div>
        </div>

        <div className="gfa-cache-scenario">
          <span className="gfa-scenario-label gfa-label-hit">HIT</span>
          <div className="gfa-cache-flow">
            <div className="gfa-node gfa-node-sm">
              <UserIcon />
              <span className="gfa-node-label-sm">Frontend</span>
            </div>

            <div className="gfa-connection gfa-conn-sm">
              <svg className="gfa-line-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
                <line x1="0" y1="20" x2="100" y2="20" className="gfa-line gfa-line-hit" />
              </svg>
              <div className="gfa-pulse gfa-pulse-hit gfa-pulse-rtl" />
            </div>

            <div className="gfa-node gfa-node-sm">
              <ObsidiaIcon />
              <span className="gfa-node-label-sm">Obsidian</span>
            </div>

            <div className="gfa-connection gfa-conn-sm gfa-conn-disabled">
              <svg className="gfa-line-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
                <line x1="0" y1="20" x2="100" y2="20" className="gfa-line gfa-line-disabled" />
              </svg>
            </div>

            <div className="gfa-node gfa-node-sm gfa-node-disabled">
              <ServerBlockIcon label="Server" />
              <span className="gfa-node-label-sm">Server</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RateLimitingAnimation() {
  return (
    <div className="gfa-root">
      <div className="gfa-rl-container">
        <div className="gfa-rl-scenario">
          <span className="gfa-scenario-label gfa-label-allowed">ALLOWED</span>
          <div className="gfa-rl-flow">
            <div className="gfa-node gfa-node-sm">
              <UserIcon />
              <span className="gfa-node-label-sm">Client</span>
            </div>

            <div className="gfa-connection gfa-conn-sm">
              <svg className="gfa-line-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
                <line x1="0" y1="20" x2="100" y2="20" className="gfa-line gfa-line-allowed" />
              </svg>
              <div className="gfa-pulse gfa-pulse-allowed-1" />
            </div>

            <div className="gfa-node gfa-node-sm">
              <svg viewBox="0 0 24 24" fill="currentColor" className="gfa-limiter-icon">
                <rect x="4" y="6" width="16" height="12" rx="2" opacity="0.4" />
                <line x1="12" y1="4" x2="12" y2="20" strokeWidth="2" />
              </svg>
              <span className="gfa-node-label-sm">Rate Limiter</span>
            </div>

            <div className="gfa-connection gfa-conn-sm">
              <svg className="gfa-line-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
                <line x1="0" y1="20" x2="100" y2="20" className="gfa-line gfa-line-allowed" />
              </svg>
              <div className="gfa-pulse gfa-pulse-allowed-2" />
            </div>

            <div className="gfa-node gfa-node-sm">
              <ServerBlockIcon label="Servers" />
              <span className="gfa-node-label-sm">API Servers</span>
            </div>

            <span className="gfa-badge gfa-badge-allowed">429: OK</span>
          </div>
        </div>

        <div className="gfa-rl-scenario">
          <span className="gfa-scenario-label gfa-label-blocked">BLOCKED</span>
          <div className="gfa-rl-flow">
            <div className="gfa-node gfa-node-sm">
              <UserIcon />
              <span className="gfa-node-label-sm">Client</span>
            </div>

            <div className="gfa-connection gfa-conn-sm">
              <svg className="gfa-line-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
                <line x1="0" y1="20" x2="100" y2="20" className="gfa-line gfa-line-blocked" />
              </svg>
              <div className="gfa-pulse gfa-pulse-blocked" />
            </div>

            <div className="gfa-node gfa-node-sm">
              <svg viewBox="0 0 24 24" fill="currentColor" className="gfa-limiter-icon">
                <rect x="4" y="6" width="16" height="12" rx="2" opacity="0.4" />
                <line x1="12" y1="4" x2="12" y2="20" strokeWidth="2" />
              </svg>
              <span className="gfa-node-label-sm">Rate Limiter</span>
            </div>

            <div className="gfa-connection gfa-conn-sm gfa-conn-disabled">
              <svg className="gfa-line-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
                <line x1="0" y1="20" x2="100" y2="20" className="gfa-line gfa-line-disabled" />
              </svg>
            </div>

            <div className="gfa-node gfa-node-sm gfa-node-disabled">
              <ServerBlockIcon label="Servers" />
              <span className="gfa-node-label-sm">API Servers</span>
            </div>

            <span className="gfa-badge gfa-badge-blocked">429: Too Many</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Button from "../components/ui/Button";
import UsageChart from "../components/charts/UsageChart";
import { useAuth } from "../context/AuthContext";
import { fetchLogs, fetchStats, fetchUsersDirectory } from "../services/logs";
import { getNavigationItems } from "../services/navigation";

function toUserGroups(logs, emailByUserId) {
  const grouped = new Map();

  logs.forEach((entry) => {
    const userId = entry.userId || "unknown";
    const current = grouped.get(userId) || {
      userId,
      email: emailByUserId.get(userId) || entry.email || null,
      totalRequests: 0,
      statusErrors: 0,
      apiKeys: new Set(),
      routes: new Set()
    };

    current.totalRequests += 1;
    if (Number(entry.status) >= 400) {
      current.statusErrors += 1;
    }

    if (entry.apiKey) {
      current.apiKeys.add(entry.apiKey);
    }

    if (entry.path) {
      current.routes.add(entry.path);
    }

    if (!current.email) {
      current.email = emailByUserId.get(userId) || entry.email || null;
    }

    grouped.set(userId, current);
  });

  return Array.from(grouped.values()).map((user) => ({
    ...user,
    apiKeyCount: user.apiKeys.size,
    routeCount: user.routes.size
  }));
}

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [usersDirectory, setUsersDirectory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setError("");
    try {
      const [rawLogs, summary, directory] = await Promise.all([
        fetchLogs(),
        fetchStats(),
        fetchUsersDirectory()
      ]);
      setLogs(rawLogs);
      setStats(summary);
      setUsersDirectory(directory);
    } catch (nextError) {
      setError(nextError.message || "Unable to load admin overview");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const emailByUserId = useMemo(() => {
    const map = new Map();
    usersDirectory.forEach((item) => {
      if (item?.userId) {
        map.set(item.userId, item.email || null);
      }
    });
    return map;
  }, [usersDirectory]);

  const users = useMemo(() => toUserGroups(logs, emailByUserId), [logs, emailByUserId]);

  return (
    <AppShell
      title="God View"
      subtitle="Global observability and user-level gateway usage"
      navItems={getNavigationItems(user?.role)}
      onRefresh={loadData}
      onLogout={() => {
        logout();
        navigate("/login");
      }}
    >
      <section className="summary-grid">
        <div className="summary-card">
          <p>Total Requests</p>
          <strong>{stats?.total ?? 0}</strong>
        </div>
        <div className="summary-card">
          <p>Errors</p>
          <strong>{stats?.errors ?? 0}</strong>
        </div>
        <div className="summary-card">
          <p>Active Users</p>
          <strong>{users.length}</strong>
        </div>
      </section>

      <section className="panel">
        <h3>Global Traffic Pattern</h3>
        <UsageChart logs={logs} />
        <div className="small-top">
          <Button variant="ghost" onClick={() => navigate("/admin/logs")}>
            View All Global Logs
          </Button>
        </div>
      </section>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <p className="muted">Loading admin overview...</p> : null}

      {!loading ? (
        <section>
          <div className="section-head">
            <h2>Users Overview</h2>
            <p className="muted">Click a user box to inspect all observed activity and API keys.</p>
          </div>
          <div className="api-grid">
            {users.map((user) => (
              <article className="api-card" key={user.userId}>
                <div className="api-card-head">
                  <div>
                    <p className="muted">User Email</p>
                    <h3 className="admin-email-text">{user.email || "Email unavailable"}</h3>
                  </div>
                </div>

                <div className="api-metrics">
                  <div>
                    <span>APIs</span>
                    <strong>{user.apiKeyCount}</strong>
                  </div>
                  <div>
                    <span>Routes</span>
                    <strong>{user.routeCount}</strong>
                  </div>
                </div>

                <div className="api-actions">
                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/admin/user/${encodeURIComponent(user.userId)}`)}
                  >
                    Open User Dashboard
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

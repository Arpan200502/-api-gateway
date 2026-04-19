import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import UsageChart from "../components/charts/UsageChart";
import Button from "../components/ui/Button";
import LogsTable from "../components/logs/LogsTable";
import { useAuth } from "../context/AuthContext";
import { deleteApi } from "../services/gateway";
import { fetchLogs, fetchUsersDirectory } from "../services/logs";
import { getNavigationItems } from "../services/navigation";

function summarizeApis(logs) {
  const grouped = new Map();

  logs.forEach((entry) => {
    const key = entry.apiKey || "unknown";
    const current = grouped.get(key) || {
      apikey: key,
      displayName: key,
      targets: [],
      routes: new Set(),
      requestCount: 0,
      errorCount: 0,
      latestSeenAt: null
    };

    current.requestCount += 1;
    if (Number(entry.status) >= 400) {
      current.errorCount += 1;
    }

    if (entry.path) {
      current.routes.add(entry.path);
    }

    const time = entry.timestamp ? new Date(entry.timestamp).getTime() : Date.now();
    if (!current.latestSeenAt || time > current.latestSeenAt) {
      current.latestSeenAt = time;
    }

    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map((api) => ({
      ...api,
      routes: Array.from(api.routes)
    }))
    .sort((a, b) => (b.latestSeenAt || 0) - (a.latestSeenAt || 0));
}

export default function AdminUserPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [usersDirectory, setUsersDirectory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const decodedUserId = decodeURIComponent(userId || "");

  async function loadData() {
    setError("");
    try {
      const [rawLogs, directory] = await Promise.all([
        fetchLogs(),
        fetchUsersDirectory()
      ]);
      setLogs(rawLogs.filter((entry) => entry.userId === decodedUserId));
      setUsersDirectory(directory);
    } catch (nextError) {
      setError(nextError.message || "Unable to load user dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [decodedUserId]);

  const userEmail = useMemo(() => {
    const fromDirectory = usersDirectory.find((item) => item?.userId === decodedUserId)?.email;
    if (fromDirectory) {
      return fromDirectory;
    }
    const withEmail = logs.find((entry) => entry.email && entry.email.trim());
    return withEmail?.email || "Email unavailable";
  }, [logs, usersDirectory, decodedUserId]);

  const userStats = useMemo(() => {
    return logs.reduce(
      (acc, entry) => {
        acc.total += 1;
        if (Number(entry.status) >= 400) {
          acc.errors += 1;
        }
        if (entry.cache === "HIT") {
          acc.cacheHits += 1;
        }
        if (entry.cache === "MISS") {
          acc.cacheMiss += 1;
        }
        return acc;
      },
      { total: 0, errors: 0, cacheHits: 0, cacheMiss: 0 }
    );
  }, [logs]);

  const apis = useMemo(() => summarizeApis(logs), [logs]);

  const handleDelete = async (apiKey) => {
    const confirmed = window.confirm(`Delete API ${apiKey}?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteApi(apiKey);
      await loadData();
    } catch (nextError) {
      setError(
        nextError.message ||
          "Delete failed. Cross-user API management requires backend admin permissions on /dev routes."
      );
    }
  };

  return (
    <AppShell
      title="User Drill-down"
      subtitle={`User Email: ${userEmail}`}
      navItems={getNavigationItems(user?.role)}
      onRefresh={loadData}
      onLogout={() => {
        logout();
        navigate("/login");
      }}
    >
      <section className="section-head">
        <h2>Observed APIs for User</h2>
        <Button variant="ghost" onClick={() => navigate("/admin/overview")}>
          Back to God View
        </Button>
      </section>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <p className="muted">Loading user data...</p> : null}

      {!loading ? (
        <>
          <section className="summary-grid">
            <div className="summary-card">
              <p>Total Requests</p>
              <strong>{userStats.total}</strong>
            </div>
            <div className="summary-card">
              <p>Errors</p>
              <strong>{userStats.errors}</strong>
            </div>
            <div className="summary-card">
              <p>Cache Hit / Miss</p>
              <strong>
                {userStats.cacheHits} / {userStats.cacheMiss}
              </strong>
            </div>
          </section>

          <section className="panel">
            <h3>User Traffic Pattern</h3>
            <UsageChart logs={logs} />
          </section>

          <section className="api-grid">
            {apis.map((api) => (
              <article className="api-card" key={api.apikey}>
                <div className="api-card-head">
                  <div>
                    <p className="muted">Gateway</p>
                    <h3>{api.apikey}</h3>
                  </div>
                  <span className="api-key-chip">{api.requestCount} req</span>
                </div>

                <div className="api-metrics">
                  <div>
                    <span>Routes Seen</span>
                    <strong>{api.routes.length}</strong>
                  </div>
                  <div>
                    <span>Errors</span>
                    <strong>{api.errorCount}</strong>
                  </div>
                </div>

                <div className="api-actions">
                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/dashboard/api/${encodeURIComponent(api.apikey)}`)}
                  >
                    Logs
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(api.apikey)}
                  >
                    Delete API
                  </Button>
                </div>
              </article>
            ))}
          </section>

          <section className="panel">
            <h3>All Logs for User</h3>
            <LogsTable logs={logs} showApi />
          </section>
        </>
      ) : null}
    </AppShell>
  );
}

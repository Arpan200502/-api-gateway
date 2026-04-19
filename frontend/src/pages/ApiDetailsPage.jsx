import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import UsageChart from "../components/charts/UsageChart";
import Button from "../components/ui/Button";
import LogsTable from "../components/logs/LogsTable";
import { useAuth } from "../context/AuthContext";
import { fetchApiByKey } from "../services/gateway";
import { fetchLogs } from "../services/logs";
import { getApiNameMap } from "../services/storage";
import { getNavigationItems } from "../services/navigation";

export default function ApiDetailsPage() {
  const { apiKey } = useParams();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [apiDetails, setApiDetails] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const decodedApiKey = decodeURIComponent(apiKey || "");

  const loadData = async () => {
    if (!decodedApiKey) {
      return;
    }

    setError("");
    try {
      const [api, rawLogs] = await Promise.all([
        fetchApiByKey(decodedApiKey),
        fetchLogs()
      ]);

      setApiDetails(api);
      setLogs(rawLogs.filter((entry) => entry.apiKey === decodedApiKey));
    } catch (nextError) {
      setError(nextError.message || "Unable to load API analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [decodedApiKey]);

  const apiName = useMemo(() => {
    const map = getApiNameMap();
    return map[decodedApiKey] || decodedApiKey;
  }, [decodedApiKey]);

  const stats = useMemo(() => {
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

  return (
    <AppShell
      title={`API Detail: ${apiName}`}
      subtitle={`Gateway Key: ${decodedApiKey}`}
      navItems={getNavigationItems(user?.role)}
      onRefresh={loadData}
      onLogout={() => {
        logout();
        navigate("/login");
      }}
    >
      <section className="section-head">
        <h2>Usage & Logs</h2>
        <div className="topbar-actions">
          <Button
            variant="ghost"
            onClick={() => navigate(`/dashboard/api/${encodeURIComponent(decodedApiKey)}/logs`)}
          >
            View All Logs
          </Button>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </section>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <p className="muted">Loading analytics...</p> : null}

      {!loading && apiDetails ? (
        <>
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
              <p>Cache Hit / Miss</p>
              <strong>
                {stats?.cacheHits ?? 0} / {stats?.cacheMiss ?? 0}
              </strong>
            </div>
          </section>

          <section className="panel">
            <h3>Traffic Pattern</h3>
            <UsageChart logs={logs} />
          </section>

          <section className="panel">
            <h3>Recent Developer Logs</h3>
            <LogsTable logs={logs} limit={15} />
          </section>

          <section className="panel">
            <h3>Route Configuration</h3>
            <div className="route-settings-list">
              {apiDetails.routes?.map((route, index) => (
                <div className="route-line" key={`${route.path}-${index}`}>
                  <strong>{route.path}</strong>
                  <span>Cache: {route.cache ? "ON" : "OFF"}</span>
                  <span>TTL: {route.cache ? route.cacheTTL : "-"}</span>
                  <span>Rate Limit: {route.rateLimit}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}

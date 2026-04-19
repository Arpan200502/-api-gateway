import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Button from "../components/ui/Button";
import LogsTable from "../components/logs/LogsTable";
import { useAuth } from "../context/AuthContext";
import { fetchLogs } from "../services/logs";
import { getApiNameMap } from "../services/storage";
import { getNavigationItems } from "../services/navigation";

export default function ApiAllLogsPage() {
  const { apiKey } = useParams();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const decodedApiKey = decodeURIComponent(apiKey || "");

  useEffect(() => {
    async function loadLogs() {
      setError("");
      try {
        const rawLogs = await fetchLogs();
        setLogs(rawLogs.filter((entry) => entry.apiKey === decodedApiKey));
      } catch (nextError) {
        setError(nextError.message || "Unable to load logs");
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, [decodedApiKey]);

  const apiName = useMemo(() => {
    const map = getApiNameMap();
    return map[decodedApiKey] || decodedApiKey;
  }, [decodedApiKey]);

  return (
    <AppShell
      title={`All Logs: ${apiName}`}
      subtitle={`API Key: ${decodedApiKey}`}
      navItems={getNavigationItems(user?.role)}
      onRefresh={() => navigate(0)}
      onLogout={() => {
        logout();
        navigate("/login");
      }}
    >
      <section className="section-head">
        <h2>All Logs Till Date</h2>
        <Button variant="ghost" onClick={() => navigate(`/dashboard/api/${encodeURIComponent(decodedApiKey)}`)}>
          Back to API Detail
        </Button>
      </section>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <p className="muted">Loading logs...</p> : null}

      {!loading ? (
        <section className="panel">
          <LogsTable logs={logs} />
        </section>
      ) : null}
    </AppShell>
  );
}

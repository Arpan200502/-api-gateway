import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import LogsTable from "../components/logs/LogsTable";
import { useAuth } from "../context/AuthContext";
import { fetchLogs } from "../services/logs";
import { getNavigationItems } from "../services/navigation";

export default function AdminLogsPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadLogs() {
      setError("");
      try {
        const rawLogs = await fetchLogs();
        setLogs(rawLogs);
      } catch (nextError) {
        setError(nextError.message || "Unable to load global logs");
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, []);

  return (
    <AppShell
      title="Global Logs Dashboard"
      subtitle="All traffic across users"
      navItems={getNavigationItems(user?.role)}
      onRefresh={() => navigate(0)}
      onLogout={() => {
        logout();
        navigate("/login");
      }}
    >
      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <p className="muted">Loading global logs...</p> : null}

      {!loading ? (
        <section className="panel">
          <LogsTable logs={logs} showUser showApi />
        </section>
      ) : null}
    </AppShell>
  );
}

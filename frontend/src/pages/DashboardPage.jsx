import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import ApiCard from "../components/gateway/ApiCard";
import EmptyState from "../components/gateway/EmptyState";
import ApiWizardModal from "../components/gateway/ApiWizardModal";
import RouteSettingsModal from "../components/gateway/RouteSettingsModal";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { getNavigationItems } from "../services/navigation";
import { createApi, deleteApi, fetchApiByKey, fetchApis, updateApi } from "../services/gateway";
import {
  getApiNameMap,
  getSelectedApiKey,
  setApiNameForKey,
  removeApiNameForKey,
  setSelectedApiKey,
  setStoredApiKeys
} from "../services/storage";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wizardMode, setWizardMode] = useState(null);
  const [editApi, setEditApi] = useState(null);
  const [activeRouteApi, setActiveRouteApi] = useState(null);

  const hydrateApis = (data) => {
    const keyNames = getApiNameMap();
    const nextApis = data.map((api) => ({
      ...api,
      displayName: keyNames[api.apikey] || `Gateway ${api.apikey.slice(0, 8)}`
    }));
    setApis(nextApis);
    setStoredApiKeys(nextApis.map((entry) => entry.apikey));

    const selected = getSelectedApiKey();
    if (!selected && nextApis.length > 0) {
      setSelectedApiKey(nextApis[0].apikey);
    }
  };

  const loadApis = async () => {
    setError("");
    try {
      const list = await fetchApis();
      hydrateApis(list);
    } catch (nextError) {
      setError(nextError.message || "Unable to load APIs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApis();
    const intervalId = setInterval(loadApis, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const summary = useMemo(() => {
    const routes = apis.reduce((total, api) => total + (api.routes?.length || 0), 0);
    const backends = apis.reduce((total, api) => total + (api.targets?.length || 0), 0);
    return { routes, backends };
  }, [apis]);

  const openCreate = () => {
    setEditApi(null);
    setWizardMode("create");
  };

  const openEdit = async (api) => {
    setError("");
    try {
      const details = await fetchApiByKey(api.apikey);
      setEditApi({
        apiKey: api.apikey,
        name: api.displayName,
        targets: details.targets || [],
        routes: details.routes || []
      });
      setWizardMode("edit");
    } catch (nextError) {
      setError(nextError.message || "Unable to load API data for update");
    }
  };

  const handleCreate = async (payload) => {
    const result = await createApi(payload);
    if (result?.apikey) {
      setApiNameForKey(result.apikey, payload.name || `Gateway ${result.apikey.slice(0, 8)}`);
      await loadApis();
    }
  };

  const handleUpdate = async (payload) => {
    if (!editApi?.apiKey) {
      throw new Error("Missing API key for update");
    }
    await updateApi(editApi.apiKey, payload);
    setApiNameForKey(editApi.apiKey, payload.name || editApi.name);
    await loadApis();
  };

  const handleDelete = async (api) => {
    const confirmed = window.confirm(`Delete ${api.displayName}?`);
    if (!confirmed) {
      return;
    }
    try {
      await deleteApi(api.apikey);
      removeApiNameForKey(api.apikey);
      await loadApis();
    } catch (nextError) {
      setError(nextError.message || "Unable to delete API");
    }
  };

  return (
    <AppShell
      title="Gateway Dashboard"
      subtitle="Track and manage your API gateway configurations"
      navItems={getNavigationItems(user?.role)}
      onRefresh={loadApis}
      onLogout={() => {
        logout();
        navigate("/login");
      }}
    >
      <section className="summary-grid">
        <div className="summary-card">
          <p>Total Gateways</p>
          <strong>{apis.length}</strong>
        </div>
        <div className="summary-card">
          <p>Total Routes</p>
          <strong>{summary.routes}</strong>
        </div>
        <div className="summary-card">
          <p>Backend Targets</p>
          <strong>{summary.backends}</strong>
        </div>
      </section>

      <section className="section-head">
        <div>
          <h2>My APIs / Apps</h2>
          <p className="muted">Click refresh anytime to fetch newly created APIs.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Create API
        </Button>
      </section>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <p className="muted">Loading gateway list...</p> : null}

      {!loading && apis.length === 0 ? <EmptyState onCreate={openCreate} /> : null}

      <section className="api-grid">
        {apis.map((api) => (
          <ApiCard
            key={api.apikey}
            api={api}
            onOpenDetails={() => navigate(`/dashboard/api/${encodeURIComponent(api.apikey)}`)}
            onViewRoutes={() => setActiveRouteApi(api)}
            onEdit={() => openEdit(api)}
            onDelete={() => handleDelete(api)}
          />
        ))}
      </section>

      {wizardMode ? (
        <ApiWizardModal
          mode={wizardMode}
          initialData={wizardMode === "edit" ? editApi : null}
          onClose={() => {
            setWizardMode(null);
            setEditApi(null);
          }}
          onSubmit={wizardMode === "edit" ? handleUpdate : handleCreate}
        />
      ) : null}

      {activeRouteApi ? (
        <RouteSettingsModal api={activeRouteApi} onClose={() => setActiveRouteApi(null)} />
      ) : null}
    </AppShell>
  );
}

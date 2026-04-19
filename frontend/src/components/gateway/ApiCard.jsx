import { BarChart3, FileText, Pencil, Trash2 } from "lucide-react";
import Button from "../ui/Button";

export default function ApiCard({ api, onOpenDetails, onViewRoutes, onEdit, onDelete }) {
  const routeCount = Array.isArray(api.routes) ? api.routes.length : 0;
  const targetCount = Array.isArray(api.targets) ? api.targets.length : 0;

  return (
    <article className="api-card">
      <div className="api-card-head">
        <div>
          <p className="muted">Gateway</p>
          <h3>{api.displayName || api.apikey}</h3>
        </div>
        <span className="api-key-chip">{api.apikey}</span>
      </div>

      <div className="api-metrics">
        <div>
          <span>Targets</span>
          <strong>{targetCount}</strong>
        </div>
        <div>
          <span>Routes</span>
          <strong>{routeCount}</strong>
        </div>
      </div>

      <div className="api-actions">
        <Button variant="ghost" onClick={onOpenDetails}>
          <BarChart3 size={14} /> Logs
        </Button>
        <Button variant="ghost" onClick={onViewRoutes}>
          <FileText size={14} /> Routes
        </Button>
        <Button variant="ghost" onClick={onEdit}>
          <Pencil size={14} /> Update
        </Button>
        <Button variant="danger" onClick={onDelete}>
          <Trash2 size={14} /> Delete
        </Button>
      </div>
    </article>
  );
}

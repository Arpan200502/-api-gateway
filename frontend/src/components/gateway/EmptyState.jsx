export default function EmptyState({ onCreate }) {
  return (
    <div className="empty-state">
      <h3>No APIs created yet</h3>
      <p>
        Start by creating your first gateway config. You can add one or more backend targets,
        route-level cache, TTL, and rate limits.
      </p>
      <button type="button" className="btn btn-primary" onClick={onCreate}>
        + Create API
      </button>
    </div>
  );
}

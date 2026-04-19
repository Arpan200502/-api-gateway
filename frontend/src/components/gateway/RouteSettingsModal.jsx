import Modal from "../ui/Modal";

export default function RouteSettingsModal({ api, onClose }) {
  return (
    <Modal title="Route Settings" onClose={onClose}>
      <div className="route-settings-list">
        <p className="muted">Gateway key: {api.apikey}</p>
        {api.routes?.length ? (
          api.routes.map((route, index) => (
            <div className="route-line" key={`${route.path}-${index}`}>
              <strong>{route.path}</strong>
              <span>Cache: {route.cache ? "ON" : "OFF"}</span>
              <span>TTL: {route.cache ? route.cacheTTL : "-"}</span>
              <span>Rate Limit: {route.rateLimit}</span>
            </div>
          ))
        ) : (
          <p className="muted">No routes configured.</p>
        )}
      </div>
    </Modal>
  );
}

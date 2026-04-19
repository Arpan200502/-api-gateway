export default function LogsTable({ logs, limit, showUser = false, showApi = false }) {
  const rows = typeof limit === "number" ? logs.slice(0, limit) : logs;

  if (!rows.length) {
    return <p className="muted">No logs available.</p>;
  }

  return (
    <div className="log-table-wrap">
      <table className="log-table">
        <thead>
          <tr>
            <th>Time</th>
            {showUser ? <th>User</th> : null}
            {showApi ? <th>API Key</th> : null}
            <th>Method</th>
            <th>Path</th>
            <th>Status</th>
            <th>Cache</th>
            <th>Latency</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((log, index) => (
            <tr key={`${log._id || "log"}-${log.timestamp || index}-${index}`}>
              <td>{log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}</td>
              {showUser ? <td>{log.email || "Email unavailable"}</td> : null}
              {showApi ? <td>{log.apiKey || "-"}</td> : null}
              <td>{log.method || "-"}</td>
              <td>{log.path || "-"}</td>
              <td>{log.status || "-"}</td>
              <td>{log.cache || "-"}</td>
              <td>{log.responseTime ? `${log.responseTime}ms` : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

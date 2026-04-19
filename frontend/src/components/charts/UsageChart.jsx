import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

function toBucket(logs) {
  const map = new Map();
  logs.forEach((entry) => {
    const parsed = new Date(entry.timestamp || Date.now());
    const timeMs = parsed.getTime();
    if (Number.isNaN(timeMs)) {
      return;
    }

    // Group by minute so short bursts show visible incline/decline.
    const bucketMs = Math.floor(timeMs / 60000) * 60000;
    const current = map.get(bucketMs) || 0;
    map.set(bucketMs, current + 1);
  });

  return Array.from(map.entries())
    .map(([bucketMs, requests]) => {
      const date = new Date(bucketMs);
      const datePart = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
      const hour = date.getHours().toString().padStart(2, "0");
      const minute = date.getMinutes().toString().padStart(2, "0");
      const timePart = `${hour}:${minute}`;
      return {
        bucketMs,
        date: datePart,
        time: timePart,
        label: `${datePart.slice(5)} ${timePart}`,
        requests
      };
    })
    .sort((a, b) => a.bucketMs - b.bucketMs);
}

export default function UsageChart({ logs }) {
  const data = toBucket(logs).slice(-60);

  if (!data.length) {
    return <p className="muted">No usage samples yet for charting.</p>;
  }

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#31334f" />
          <XAxis dataKey="label" stroke="#8f95c2" />
          <YAxis stroke="#8f95c2" allowDecimals={false} />
          <Tooltip
            labelFormatter={(value, payload) => {
              const item = payload?.[0]?.payload;
              return item ? `${item.date} ${item.time}` : value;
            }}
          />
          <Line type="monotone" dataKey="requests" stroke="#5aa0ff" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

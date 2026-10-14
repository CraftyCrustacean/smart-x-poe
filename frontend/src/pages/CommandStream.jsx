import { useQuery } from "@tanstack/react-query";
import { useLive } from "../realtime/liveContext";

function CommandStream() {
  const { recentAlerts } = useLive();
  const { data: summary } = useQuery({
    queryKey: ["dashboardSummary"],
    queryFn: () =>
      fetch("http://localhost:8080/api/dashboard/summary").then((r) =>
        r.json(),
      ),
    staleTime: Infinity,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        Real-Time Command Stream and History
      </h1>
      {summary && (
        <p className="text-slate-600 my-4">
          Last batch {summary.lastBatchTimestamp?.slice(0, 10) ?? "—"} ·{" "}
          {summary.lastBatchPackets} packets · {summary.offline} offline ·{" "}
          {summary.activeAlerts} active alerts
        </p>
      )}
      <ul className="text-sm text-slate-600 space-y-1">
        {recentAlerts.map((a) => (
          <li key={`${a.deviceId}-${a.metric}-${a.raisedAtUtc}`}>
            {a.deviceId} · {a.metric} = {a.value.toFixed(2)} · severity{" "}
            {a.severity.toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CommandStream;

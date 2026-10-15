import { useEffect, useState } from "react";
import { useDeviceLive } from "../../api/devices";
import { formatAgo, metricLabel } from "../../lib/format";
import { ErrorNotice, Loading, Skeleton } from "../dashboard/LoadState";

function statusOf({ state, offline }) {
  if (state.lastSeenUtc == null)
    return { label: "Never reported", dot: "bg-slate-400" };
  if (offline) return { label: "Offline", dot: "bg-red-500" };
  return { label: "Online", dot: "bg-green-500" };
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{children}</dd>
    </div>
  );
}

function TimeAgo({ iso }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString("en-GB")}>
      {formatAgo(iso)}
    </time>
  );
}

export default function DeviceLivePanel({ deviceId }) {
  const { data, isLoading, error, refetch } = useDeviceLive(deviceId);

  if (isLoading)
    return (
      <Loading label="Loading live status…">
        <Skeleton className="h-16 rounded-lg" />
      </Loading>
    );
  if (error)
    return (
      <ErrorNotice
        message="Couldn't load live status."
        error={error}
        onRetry={refetch}
      />
    );

  const status = statusOf(data);
  const { state, activeAlerts } = data;

  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Live status">
        <span className="inline-flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${status.dot}`}
            aria-hidden="true"
          />
          {status.label}
        </span>
      </Field>
      <Field label="Last seen">
        {state.lastSeenUtc ? <TimeAgo iso={state.lastSeenUtc} /> : "—"}
      </Field>
      <Field label="Battery">
        <span className="tabular-nums">
          {state.batteryPct != null ? `${state.batteryPct}%` : "—"}
        </span>
      </Field>
      <Field label="Active critical alerts">
        {activeAlerts.length === 0 ? (
          <span className="text-slate-500">None</span>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {activeAlerts.map((m) => (
              <li
                key={m}
                className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-sm text-red-700"
              >
                {metricLabel(m)}
              </li>
            ))}
          </ul>
        )}
      </Field>
    </dl>
  );
}

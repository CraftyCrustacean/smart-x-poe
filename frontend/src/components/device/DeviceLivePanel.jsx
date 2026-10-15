import { TriangleAlert } from "lucide-react";
import { useDeviceLive, useDeviceReadings } from "../../api/devices";
import { metricLabel } from "../../lib/format";
import { ErrorNotice, Loading, Skeleton } from "../dashboard/LoadState";
import TimeAgo from "../TimeAgo";

const OVERRIDE_TEXT = {
  ValveOpen: "Valve forced open",
  ValveClosed: "Valve forced closed",
};

const batchesText = (n) => `${n} more batch${n === 1 ? "" : "es"}`;

function statusOf({ state, offline }, rebootBatchesLeft) {
  if (rebootBatchesLeft != null)
    return {
      label: "Rebooting",
      detail: batchesText(rebootBatchesLeft),
      dot: "bg-amber-500",
    };
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


export default function DeviceLivePanel({ deviceId, category }) {
  const { data, isLoading, error, refetch } = useDeviceLive(deviceId);
  const { data: readings = [] } = useDeviceReadings(deviceId);

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

  const { state, activeAlerts } = data;
  const { activeOverride, currentBatch, acknowledgedAlerts } = data;
  const batchesLeft = activeOverride
    ? activeOverride.validUntilBatch - currentBatch
    : 0;
  const rebooting = activeOverride?.kind === "Rebooting";
  const valveOverride = activeOverride && !rebooting ? activeOverride : null;
  const status = statusOf(data, rebooting ? batchesLeft : null);
  const ackedCount = activeAlerts.filter((m) =>
    acknowledgedAlerts.includes(m),
  ).length;
  const alertsLabel =
    ackedCount === 0
      ? "Active critical alerts"
      : ackedCount === activeAlerts.length
        ? "Active critical alerts (acknowledged)"
        : `Active critical alerts (${ackedCount} acknowledged)`;
  const latestValve = readings.at(-1)?.valve_open;

  return (
    <>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Live status">
          <span className="inline-flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${status.dot}`}
              aria-hidden="true"
            />
            {status.label}
          </span>
          <span className="block h-4 pl-4.5 text-xs text-slate-500">
            {status.detail}
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
        {category === "Actuator" && (
          <Field label="Valve">
            {valveOverride ? (
              <span>
                {valveOverride.kind === "ValveOpen" ? "Open" : "Closed"}{" "}
                <span className="text-xs text-orange-700">(override)</span>
              </span>
            ) : latestValve == null ? (
              "—"
            ) : latestValve ? (
              "Open"
            ) : (
              "Closed"
            )}
          </Field>
        )}
        <Field label={alertsLabel}>
          {activeAlerts.length === 0 ? (
            <span className="text-slate-500">None</span>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {activeAlerts.map((m) => {
                const acked = acknowledgedAlerts.includes(m);
                return (
                  <li
                    key={m}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm ${
                      acked ? "bg-slate-100 text-slate-600" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {!acked && <TriangleAlert size={12} aria-hidden="true" />}
                    {metricLabel(m)}
                  </li>
                );
              })}
            </ul>
          )}
        </Field>
      </dl>
      {category === "Actuator" && (
        <div className="mt-4 h-7">
          {valveOverride && (
            <p className="inline-block rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-800">
              {OVERRIDE_TEXT[valveOverride.kind]} · {batchesText(batchesLeft)}
            </p>
          )}
        </div>
      )}
    </>
  );
}

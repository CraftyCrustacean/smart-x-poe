import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { useLatestSnapshots } from "../../api/dashboard";
import {
  formatValue,
  METRICS,
  metricLabel,
  THRESHOLD_METRICS,
  zoneColour,
  zoneLabel,
} from "../../lib/format";
import { ErrorNotice, Loading, Skeleton } from "./LoadState";

function MetricCell({ metric, summary }) {
  if (!summary) return <td className="px-3 py-2 text-slate-400">—</td>;
  const digits = METRICS[metric].digits;
  return (
    <td className="px-3 py-2 tabular-nums">
      <span className="text-slate-900">
        {formatValue(metric, summary.average)}
      </span>
      <span className="block text-xs text-slate-500">
        {summary.min.toFixed(digits)} to {summary.max.toFixed(digits)}
      </span>
    </td>
  );
}

function BreachList({ id, breaches }) {
  return (
    <ul id={id} className="divide-y divide-red-100">
      {breaches.map((b) => (
        <li
          key={`${b.deviceId}-${b.metric}`}
          className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5"
        >
          <Link
            to={`/devices/${b.deviceId}`}
            className="font-medium text-slate-900 hover:underline"
          >
            {b.deviceId}
          </Link>
          <span className="text-slate-600">{metricLabel(b.metric)}</span>
          <span className="font-medium tabular-nums text-red-700">
            {formatValue(b.metric, b.value)}
          </span>
          <span className="text-xs text-slate-500">
            severity {b.severity.toFixed(2)}
            {b.readings > 1 && ` · worst of ${b.readings} readings`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ScopeSummaryTable({ zone, onSelectZone }) {
  const {
    data: scopes = [],
    isLoading,
    error,
    refetch,
  } = useLatestSnapshots(zone);
  const [expanded, setExpanded] = useState(() => new Set());

  const toggle = (subzone) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(subzone)) next.add(subzone);
      return next;
    });

  if (isLoading)
    return (
      <Loading label="Loading table…" className="space-y-2">
        <Skeleton className="h-6" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </Loading>
    );
  if (error && scopes.length === 0)
    return (
      <ErrorNotice
        message="Couldn't load the latest readings."
        error={error}
        onRetry={refetch}
      />
    );
  if (scopes.length === 0)
    return (
      <p className="text-sm text-slate-500">
        Waiting for the first batch to close…
      </p>
    );

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-sm text-left">
        <caption className="sr-only">
          Latest simulated day per {zone ? "subzone" : "zone"}: average, with
          minimum to maximum below
        </caption>
        <thead className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
          <tr>
            <th scope="col" className="px-3 py-2">
              {zone ? "Subzone" : "Zone"}
            </th>
            {THRESHOLD_METRICS.map((m) => (
              <th key={m} scope="col" className="px-3 py-2">
                {METRICS[m].label}
              </th>
            ))}
            <th scope="col" className="px-3 py-2">
              Past threshold
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {scopes.map((s) => {
            const metrics = s.snapshot.metrics;
            const breaching = THRESHOLD_METRICS.reduce(
              (n, m) => n + (metrics[m]?.breaching ?? 0),
              0,
            );
            const breaches = (s.snapshot.breaches ?? []).filter((b) =>
              THRESHOLD_METRICS.includes(b.metric),
            );
            const canExpand = zone && breaches.length > 0;
            const isOpen = canExpand && expanded.has(s.subzone);
            const listId = `breaches-${s.zone}-${s.subzone}`;
            const onRowClick = !zone
              ? () => onSelectZone(s.zone)
              : canExpand
                ? () => toggle(s.subzone)
                : null;
            return (
              <Fragment key={s.subzone ?? s.zone}>
                <tr
                  onClick={
                    onRowClick &&
                    (() => {
                      if (window.getSelection()?.toString()) return;
                      onRowClick();
                    })
                  }
                  className={`${
                    onRowClick
                      ? `group cursor-pointer transition-colors motion-reduce:transition-none ${
                          isOpen
                            ? "bg-red-50/40 hover:bg-red-50"
                            : "hover:bg-orange-50"
                        }`
                      : ""
                  }`}
                >
                  <th
                    scope="row"
                    className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap"
                  >
                    {!zone ? (
                      <button
                        type="button"
                        title={`View ${zoneLabel(s.zone)} by subzone`}
                        className="inline-flex items-center gap-2 group-hover:underline"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full transition-transform motion-reduce:transition-none group-hover:scale-125"
                          style={{ background: zoneColour(s.zone) }}
                          aria-hidden="true"
                        />
                        {zoneLabel(s.zone)}
                        <ChevronRight
                          size={14}
                          aria-hidden="true"
                          className="-ml-1 text-slate-400 opacity-0 transition-all motion-reduce:transition-none group-hover:translate-x-1 group-hover:opacity-100"
                        />
                      </button>
                    ) : canExpand ? (
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={listId}
                        title={`${isOpen ? "Hide" : "Show"} sensors past threshold`}
                        className="inline-flex items-center gap-1 group-hover:underline"
                      >
                        <ChevronRight
                          size={14}
                          aria-hidden="true"
                          className={`text-slate-500 transition-transform motion-reduce:transition-none ${
                            isOpen ? "rotate-90" : "group-hover:translate-x-0.5"
                          }`}
                        />
                        {s.subzone}
                      </button>
                    ) : (
                      <span className="pl-[18px]">{s.subzone}</span>
                    )}
                  </th>
                  {THRESHOLD_METRICS.map((m) => (
                    <MetricCell key={m} metric={m} summary={metrics[m]} />
                  ))}
                  <td className="px-3 py-2 tabular-nums">
                    {breaching > 0 ? (
                      <span className="inline-flex items-center gap-1 text-red-700">
                        <TriangleAlert size={14} aria-hidden="true" />{" "}
                        {breaching}
                      </span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="bg-red-50/40">
                    <td
                      colSpan={THRESHOLD_METRICS.length + 2}
                      className="px-3 pb-2 pl-8"
                    >
                      <BreachList id={listId} breaches={breaches} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

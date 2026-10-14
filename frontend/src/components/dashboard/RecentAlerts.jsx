import { Link } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { useLive } from "../../realtime/liveContext";
import { formatValue, metricLabel, zoneLabel } from "../../lib/format";
import SegmentedToggle from "./SegmentedToggle";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "severity", label: "Severity" },
];

export default function RecentAlerts({ sort, onSortChange, zoneHref }) {
  const { recentAlerts } = useLive();
  const alerts =
    sort === "severity"
      ? [...recentAlerts].sort((a, b) => b.severity - a.severity)
      : recentAlerts;

  return (
    <section
      aria-labelledby="recent-alerts-heading"
      className="bg-white border border-slate-300 rounded-lg p-4 flex flex-col xl:h-0 xl:min-h-full"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2
          id="recent-alerts-heading"
          className="text-sm font-bold text-slate-500 uppercase tracking-wide"
        >
          New critical alerts
        </h2>
        {recentAlerts.length > 1 && (
          <SegmentedToggle
            size="sm"
            label="Sort alerts by"
            options={SORTS}
            value={sort}
            onChange={onSortChange}
          />
        )}
      </div>

      {recentAlerts.length === 0 ? (
        <p className="text-sm text-slate-500">
          None since you opened the app. New alerts appear here the moment they
          are raised.
        </p>
      ) : (
        <ul
          className="divide-y divide-slate-200 max-h-[32rem] overflow-y-auto xl:max-h-none xl:flex-1 xl:min-h-0"
          aria-live="polite"
        >
          {alerts.map((a) => (
            <li
              key={`${a.deviceId}-${a.metric}-${a.raisedAtUtc}`}
              className="py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <TriangleAlert
                  size={14}
                  className="text-red-600 shrink-0"
                  aria-hidden="true"
                />
                <Link
                  to={`/devices/${a.deviceId}`}
                  className="font-medium text-slate-900 hover:underline truncate"
                >
                  {a.deviceId}
                </Link>
              </div>
              <p className="pl-6 text-slate-600">
                {metricLabel(a.metric)} {formatValue(a.metric, a.value)} ·
                severity {a.severity.toFixed(2)}
              </p>
              <p className="pl-6 text-xs text-slate-500">
                <Link
                  to={zoneHref(a.zone)}
                  title={`View ${zoneLabel(a.zone)} by subzone`}
                  className="hover:text-slate-900 hover:underline"
                >
                  {zoneLabel(a.zone)}
                </Link>{" "}
                · {a.subzone}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

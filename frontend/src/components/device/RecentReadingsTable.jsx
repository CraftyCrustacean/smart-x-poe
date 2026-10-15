import { useThresholds } from "../../api/dashboard";
import { useDeviceReadings } from "../../api/devices";
import {
  formatSimDate,
  formatValue,
  isPastThreshold,
  METRICS,
} from "../../lib/format";

const COLUMNS = {
  Environmental: [
    "elevation_change_mm",
    "surface_temperature_c",
    "colour_shift_index",
    "battery_level_pct",
  ],
  FlowRate: ["flow_rate_lps", "battery_level_pct"],
  Actuator: ["valve_open", "battery_level_pct"],
};

const HEADERS = { battery_level_pct: "Battery", valve_open: "Valve" };

function display(metric, value) {
  if (metric === "battery_level_pct") return `${value}%`;
  if (metric === "valve_open") return value ? "Open" : "Closed";
  return formatValue(metric, value);
}

export default function RecentReadingsTable({ deviceId, category, rows = 10 }) {
  const { data: readings = [] } = useDeviceReadings(deviceId);
  const { data: thresholds } = useThresholds();
  const columns = COLUMNS[category] ?? [];
  const newestFirst = [...readings].reverse().slice(0, rows);

  if (newestFirst.length === 0)
    return <p className="text-sm text-slate-500">No readings received yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <caption className="sr-only">
          Most recent {newestFirst.length} readings, newest first
        </caption>
        <thead className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
          <tr>
            <th scope="col" className="px-3 py-2">
              Simulated day
            </th>
            {columns.map((c) => (
              <th key={c} scope="col" className="px-3 py-2">
                {METRICS[c]?.label ?? HEADERS[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {newestFirst.map((r) => (
            <tr key={r.timestamp}>
              <th
                scope="row"
                className="px-3 py-2 font-normal text-slate-600 whitespace-nowrap"
              >
                {formatSimDate(r.timestamp)}
              </th>
              {columns.map((c) => {
                const threshold = thresholds?.[METRICS[c]?.thresholdKey];
                const past = METRICS[c] && isPastThreshold(r[c], threshold);
                return (
                  <td
                    key={c}
                    className={`px-3 py-2 tabular-nums ${past ? "text-red-700 font-medium" : "text-slate-900"}`}
                  >
                    {display(c, r[c])}
                    {past && (
                      <span className="sr-only">
                        {" "}
                        (past critical threshold)
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {thresholds && columns.some((c) => METRICS[c]) && (
        <p className="mt-3 text-xs text-slate-500">
          Red readings are past the critical threshold.
        </p>
      )}
    </div>
  );
}

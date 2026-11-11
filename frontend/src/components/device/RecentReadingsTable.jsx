import { useThresholds } from "../../api/dashboard";
import { useDeviceReadings } from "../../api/devices";
import { formatSimDate, isPastThreshold, METRICS } from "../../lib/format";
import {
  displayReading,
  READING_COLUMNS,
  readingHeader,
} from "../../lib/readings";

export default function RecentReadingsTable({ deviceId, category, rows = 10 }) {
  const { data: readings = [] } = useDeviceReadings(deviceId);
  const { data: thresholds } = useThresholds();
  const columns = READING_COLUMNS[category] ?? [];
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
                {readingHeader(c)}
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
                    {displayReading(c, r[c])}
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

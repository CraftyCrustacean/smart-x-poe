import { useSearchParams } from "react-router-dom";
import { useThresholds } from "../../api/dashboard";
import { useDeviceHistory, useHistoryBounds } from "../../api/history";
import { isPastThreshold, METRICS } from "../../lib/format";
import {
  addDays,
  dayOf,
  DEFAULT_DAYS,
  DEFAULT_LIMIT,
  formatCount,
  formatDay,
  formatMicros,
  formatTime,
  HISTORY_LIMITS,
} from "../../lib/history";
import { displayReading, READING_COLUMNS, readingHeader } from "../../lib/readings";
import { ErrorNotice, Loading, Skeleton } from "../dashboard/LoadState";

function Badge({ tone, children }) {
  const tones = {
    red: "bg-red-50 text-red-700 border-red-200",
    orange: "bg-orange-50 text-orange-800 border-orange-200",
  };
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function StatCard({ label, value, detail }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap">
        {value}
        {detail && <span className="ml-1 text-xs font-normal text-slate-500">{detail}</span>}
      </dd>
    </div>
  );
}

export default function HistoryQuery({ deviceId, category }) {
  const [params, setParams] = useSearchParams();
  const bounds = useHistoryBounds(deviceId);
  const { data: thresholds } = useThresholds();

  const newestDay = bounds.data?.newest ? dayOf(bounds.data.newest) : null;
  const oldestDay = bounds.data?.oldest ? dayOf(bounds.data.oldest) : null;

  const pinnedFrom = params.get("from");
  const pinnedTo = params.get("to");
  const to = pinnedTo ?? newestDay;
  const from = pinnedFrom ?? (to ? addDays(to, -(DEFAULT_DAYS - 1)) : null);
  const limitParam = Number(params.get("limit"));
  const limit = HISTORY_LIMITS.includes(limitParam) ? limitParam : DEFAULT_LIMIT;
  const compare = params.get("compare") === "1";

  const history = useDeviceHistory(deviceId, {
    from,
    to,
    limit,
    compare,
    follow: !pinnedTo,
  });

  const setParam = (key, value) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  const resetRange = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("from");
        next.delete("to");
        return next;
      },
      { replace: true },
    );

  if (bounds.isLoading)
    return (
      <Loading label="Loading history">
        <Skeleton className="h-40" />
      </Loading>
    );

  if (bounds.error)
    return (
      <ErrorNotice
        message="Couldn't load this device's history."
        error={bounds.error}
        onRetry={() => bounds.refetch()}
      />
    );

  if (!bounds.data?.stored)
    return <p className="text-sm text-slate-500">No readings stored yet.</p>;

  const columns = READING_COLUMNS[category] ?? [];
  const result = history.data;
  const newestFirst = result ? [...result.rows].reverse() : [];
  const badRange = from && to && from > to;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="flex flex-col text-xs text-slate-500">
          From
          <input
            type="date"
            value={from ?? ""}
            min={oldestDay ?? undefined}
            max={newestDay ?? undefined}
            onChange={(e) => setParam("from", e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900"
          />
        </label>
        <label className="flex flex-col text-xs text-slate-500">
          To
          <input
            type="date"
            value={to ?? ""}
            min={oldestDay ?? undefined}
            max={newestDay ?? undefined}
            onChange={(e) => setParam("to", e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900"
          />
        </label>
        <label className="flex flex-col text-xs text-slate-500">
          Limit
          <select
            value={limit}
            onChange={(e) =>
              setParam("limit", Number(e.target.value) === DEFAULT_LIMIT ? "" : e.target.value)
            }
            className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
          >
            {HISTORY_LIMITS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 pb-1.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setParam("compare", e.target.checked ? "1" : "")}
            className="h-4 w-4 cursor-pointer appearance-none rounded border border-slate-400 bg-white transition-colors checked:border-orange-500 checked:bg-orange-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
          />
          Compare with linear scan
        </label>
        {(pinnedFrom || pinnedTo) && (
          <button
            type="button"
            onClick={resetRange}
            className="mb-0.5 px-3 py-1 rounded-md border border-orange-200 bg-white text-sm text-slate-600 hover:bg-orange-100 transition-colors"
          >
            Latest {DEFAULT_DAYS} days
          </button>
        )}
        <p className="pb-1.5 text-xs text-slate-500">
          Stored readings from {formatDay(oldestDay)} to {formatDay(newestDay)}
        </p>
      </div>

      {badRange && (
        <p role="alert" className="text-sm text-red-700">
          The start date is after the end date.
        </p>
      )}

      {!badRange && history.error && (
        <ErrorNotice
          message="Couldn't run the history query."
          error={history.error}
          onRetry={() => history.refetch()}
        />
      )}

      {!badRange && !history.error && !result && (
        <Loading label="Running query">
          <Skeleton className="h-40" />
        </Loading>
      )}

      {!badRange && !history.error && result && (
        <div aria-busy={history.isFetching} className={history.isPlaceholderData ? "opacity-60" : ""}>
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2 mb-3">
            <StatCard label="Stored" value={formatCount(result.stored)} />
            <StatCard
              label="Tree height"
              value={result.treeHeight}
              detail={`AVL max ${result.maxAvlHeight}`}
            />
            <StatCard label="Rebalances"value={formatCount(result.rotations)} />
            <StatCard
              label="Visited"
              value={formatCount(result.visitedNodes)}
              detail={`of ${formatCount(result.stored)}`}
            />
            <StatCard label="Returned" value={formatCount(result.returned)} />
            <StatCard label="AVL query" value={formatMicros(result.elapsedMicroseconds)} />
            {result.linearScanMicroseconds != null && (
              <StatCard
                label="Linear scan"
                value={formatMicros(result.linearScanMicroseconds)}
                detail={`${formatCount(result.stored)} nodes`}
              />
            )}
          </dl>

          {result.returned === 0 ? (
            <p className="text-sm text-slate-500">No readings in this range.</p>
          ) : (
            <div className="max-h-[28rem] overflow-auto border border-slate-200 rounded-md">
              <table className="w-full text-sm text-left">
                <caption className="sr-only">
                  {result.returned} readings from {formatDay(from)} to {formatDay(to)}, newest
                  first
                </caption>
                <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      Simulated day
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Time
                    </th>
                    {columns.map((c) => (
                      <th key={c} scope="col" className="px-3 py-2">
                        {readingHeader(c)}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {newestFirst.map((r, i) => {
                    const pastByColumn = columns.map(
                      (c) =>
                        Boolean(METRICS[c]) &&
                        isPastThreshold(r[c], thresholds?.[METRICS[c].thresholdKey]),
                    );
                    const critical = pastByColumn.some(Boolean);
                    return (
                      <tr key={`${r.timestamp}-${i}`}>
                        <th
                          scope="row"
                          className="px-3 py-2 font-normal text-slate-600 whitespace-nowrap"
                        >
                          {formatDay(dayOf(r.timestamp))}
                        </th>
                        <td className="px-3 py-2 tabular-nums text-slate-500">
                          {formatTime(r.timestamp)}
                        </td>
                        {columns.map((c, ci) => (
                          <td
                            key={c}
                            className={`px-3 py-2 tabular-nums ${pastByColumn[ci] ? "text-red-700 font-medium" : "text-slate-900"}`}
                          >
                            {displayReading(c, r[c])}
                          </td>
                        ))}
                        <td className="px-3 py-2 space-x-1 whitespace-nowrap">
                          {critical && <Badge tone="red">Critical</Badge>}
                          {r.overridden && <Badge tone="orange">Override</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {result.truncated && (
            <p className="mt-2 text-xs text-slate-600">
              More readings match this range. Showing the newest {result.returned}; narrow the
              dates or raise the limit to see older ones.
            </p>
          )}

          {thresholds && columns.some((c) => METRICS[c]) && (
            <p className="mt-2 text-xs text-slate-500">
              Red readings are past the critical threshold.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

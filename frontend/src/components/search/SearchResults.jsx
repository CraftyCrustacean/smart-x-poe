import { Link, useNavigate } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { logSearchClick, useDeviceSearch } from "../../api/search";
import { metricLabel, zoneLabel } from "../../lib/format";
import { filterSnapshot, SEARCH_SORTS, toApiQuery } from "../../lib/search";
import TimeAgo from "../TimeAgo";
import { ErrorNotice, Loading, Skeleton } from "../dashboard/LoadState";
import FilterChips from "./FilterChips";

function StatusCell({ r }) {
  return (
    <div className="flex flex-wrap gap-1">
      {r.offline && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
          Offline
        </span>
      )}
      {r.activeAlerts.map((m) => (
        <span
          key={m}
          className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700"
        >
          <TriangleAlert size={10} aria-hidden="true" />
          {metricLabel(m)}
        </span>
      ))}
      {r.activeOverride && (
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800">
          Override
        </span>
      )}
      {r.muted && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          Muted
        </span>
      )}
    </div>
  );
}

export default function SearchResults({ params, update }) {
  const navigate = useNavigate();
  const sort = params.get("sort") ?? "alerts";
  const page = Number(params.get("page") ?? "1");

  const { data, isLoading, isFetching, error, refetch } = useDeviceSearch(
    toApiQuery(params),
  );

  const logClick = (deviceId) => logSearchClick(deviceId, filterSnapshot(params));

  const open = (deviceId) => {
    logClick(deviceId);
    navigate(`/devices/${deviceId}`);
  };

  const from = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;
  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-3">
      <FilterChips params={params} update={update} lowBatteryPct={data?.lowBatteryPct} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <p aria-live="polite">
          {data
            ? data.total === 0
              ? "No devices match."
              : `Showing ${from}–${to} of ${data.total}${isFetching ? " · updating…" : ""}`
            : "Searching…"}
        </p>
        <label className="inline-flex items-center gap-2">
          Sort
          <select
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
            value={sort}
            onChange={(e) => update({ sort: e.target.value })}
          >
            {SEARCH_SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <Loading label="Searching…" className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </Loading>
      ) : error && !data ? (
        <ErrorNotice message="Search failed." error={error} onRetry={refetch} />
      ) : data?.total > 0 ? (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm text-left">
            <caption className="sr-only">Matching devices</caption>
            <thead className="bg-orange-100 text-xs font-bold uppercase tracking-wide text-slate-900 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-4 py-2">
                  Device ID
                </th>
                <th scope="col" className="px-4 py-2">
                  Category
                </th>
                <th scope="col" className="px-4 py-2">
                  Location
                </th>
                <th scope="col" className="px-4 py-2">
                  Battery
                </th>
                <th scope="col" className="px-4 py-2">
                  Last seen
                </th>
                <th scope="col" className="px-4 py-2">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.results.map((r) => (
                <tr
                  key={r.deviceId}
                  onClick={(e) => {
                    if (e.target.closest("a") || window.getSelection()?.toString()) return;
                    open(r.deviceId);
                  }}
                  className="cursor-pointer hover:bg-orange-50 transition-colors"
                >
                  <th
                    scope="row"
                    className="px-4 py-3 font-normal text-slate-900 whitespace-nowrap"
                  >
                    <Link
                      to={`/devices/${r.deviceId}`}
                      onClick={() => logClick(r.deviceId)}
                      className="hover:underline"
                    >
                      {r.deviceId}
                    </Link>
                  </th>
                  <td className="px-4 py-3 text-slate-500">{r.category}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {zoneLabel(r.zone)} · {r.subzone} · {r.chainageKm.toFixed(1)} km
                  </td>
                  <td className="px-4 py-3 text-slate-500 tabular-nums">
                    {r.batteryPct != null ? `${r.batteryPct}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 tabular-nums whitespace-nowrap">
                    {r.lastSeenUtc ? <TimeAgo iso={r.lastSeenUtc} /> : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusCell r={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {data && data.total > data.pageSize && (
        <nav
          aria-label="Search results pages"
          className="flex items-center justify-end gap-2 text-sm"
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => update({ page: page - 1 }, { resetPage: false })}
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="tabular-nums text-slate-600">
            Page {page} of {lastPage}
          </span>
          <button
            type="button"
            disabled={page >= lastPage}
            onClick={() => update({ page: page + 1 }, { resetPage: false })}
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}

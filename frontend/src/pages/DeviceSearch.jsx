import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { TriangleAlert, X } from "lucide-react";
import { useLatestSnapshots } from "../api/dashboard";
import { logSearchClick, useDeviceSearch } from "../api/search";
import { metricLabel, ZONE_ORDER, zoneLabel } from "../lib/format";
import {
  ALERT_OPTIONS,
  CATEGORIES,
  filterSnapshot,
  SEARCH_KEYS,
  SEARCH_SORTS,
  toApiQuery,
  withChanges,
} from "../lib/search";
import TimeAgo from "../components/TimeAgo";
import { ErrorNotice, Loading, Skeleton } from "../components/dashboard/LoadState";

const select =
  "rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700";

function Chip({ children, onRemove }) {
  return (
    <li className="inline-flex items-center gap-1 rounded-full bg-orange-100 py-0.5 pl-3 pr-1 text-sm text-orange-900">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${children}`}
        className="rounded-full p-0.5 hover:bg-orange-200"
      >
        <X size={12} aria-hidden="true" />
      </button>
    </li>
  );
}

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

function DeviceSearch() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const update = (changes, options) =>
    setParams((prev) => withChanges(prev, changes, options), { replace: true });

  const q = params.get("q")?.trim() ?? "";
  const cats = params.getAll("cat");
  const alert = params.get("alert") ?? "all";
  const zone = params.get("zone") ?? "";
  const sub = params.get("sub") ?? "";
  const sort = params.get("sort") ?? "alerts";
  const page = Number(params.get("page") ?? "1");

  const { data: subzoneScopes = [] } = useLatestSnapshots(zone || null);
  const subzones = zone ? subzoneScopes.map((s) => s.subzone) : [];

  const { data, isLoading, isFetching, error, refetch } = useDeviceSearch(
    toApiQuery(params),
  );

  const toggleCat = (c) =>
    update({ cat: cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c] });

  const clearAll = () => update(Object.fromEntries(SEARCH_KEYS.map((k) => [k, null])));

  const logClick = (deviceId) => logSearchClick(deviceId, filterSnapshot(params));

  const open = (deviceId) => {
    logClick(deviceId);
    navigate(`/devices/${deviceId}`);
  };

  const chips = [
    q && { key: "q", label: `ID contains "${q}"`, remove: () => update({ q: null }) },
    ...cats.map((c) => ({ key: `cat-${c}`, label: c, remove: () => toggleCat(c) })),
    alert !== "all" && {
      key: "alert",
      label: ALERT_OPTIONS.find((o) => o.value === alert)?.label ?? alert,
      remove: () => update({ alert: null }),
    },
    zone && {
      key: "zone",
      label: zoneLabel(zone),
      remove: () => update({ zone: null, sub: null }),
    },
    sub && { key: "sub", label: sub, remove: () => update({ sub: null }) },
    params.get("low") === "1" && {
      key: "low",
      label: `Battery ≤ ${data?.lowBatteryPct ?? "…"}%`,
      remove: () => update({ low: null }),
    },
    params.get("ovr") === "1" && {
      key: "ovr",
      label: "Active override",
      remove: () => update({ ovr: null }),
    },
  ].filter(Boolean);

  const from = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;
  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Device search</h1>
        <p className="text-slate-500">
          Type a device ID or MAC in the search bar above, then narrow the results with
          filters.
        </p>
      </div>

      <section
        aria-label="Filters"
        className="bg-white border border-slate-300 rounded-lg p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Category"
            className="inline-flex rounded-md border border-slate-300 overflow-hidden text-sm"
          >
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cats.includes(c)}
                onClick={() => toggleCat(c)}
                className={`px-3 py-1 transition-colors ${
                  cats.includes(c)
                    ? "bg-orange-100 text-slate-900"
                    : "bg-white text-slate-600 hover:bg-orange-50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <label className="sr-only" htmlFor="search-alert">
            Alert state
          </label>
          <select
            id="search-alert"
            className={select}
            value={alert}
            onChange={(e) => update({ alert: e.target.value })}
          >
            {ALERT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="search-zone">
            Zone
          </label>
          <select
            id="search-zone"
            className={select}
            value={zone}
            onChange={(e) => update({ zone: e.target.value, sub: null })}
          >
            <option value="">All zones</option>
            {ZONE_ORDER.map((z) => (
              <option key={z} value={z}>
                {zoneLabel(z)}
              </option>
            ))}
          </select>

          {zone && (
            <>
              <label className="sr-only" htmlFor="search-subzone">
                Subzone
              </label>
              <select
                id="search-subzone"
                className={select}
                value={sub}
                onChange={(e) => update({ sub: e.target.value })}
              >
                <option value="">All subzones</option>
                {subzones.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </>
          )}

          <label className="inline-flex items-center gap-1.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={params.get("low") === "1"}
              onChange={(e) => update({ low: e.target.checked ? "1" : null })}
            />
            Low battery
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={params.get("ovr") === "1"}
              onChange={(e) => update({ ovr: e.target.checked ? "1" : null })}
            />
            Active override
          </label>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <ul className="flex flex-wrap gap-2" aria-label="Active filters">
              {chips.map((c) => (
                <Chip key={c.key} onRemove={c.remove}>
                  {c.label}
                </Chip>
              ))}
            </ul>
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-orange-700 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </section>

      <section
        aria-label="Results"
        className="bg-white border border-slate-300 rounded-lg p-4 space-y-3"
      >
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
              className={select}
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <caption className="sr-only">Matching devices</caption>
              <thead className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    Device
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Category
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Location
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Battery
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Last seen
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.results.map((r) => (
                  <tr
                    key={r.deviceId}
                    onClick={(e) => {
                      if (e.target.closest("a") || window.getSelection()?.toString())
                        return;
                      open(r.deviceId);
                    }}
                    className="cursor-pointer hover:bg-orange-50"
                  >
                    <th
                      scope="row"
                      className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap"
                    >
                      <Link
                        to={`/devices/${r.deviceId}`}
                        onClick={() => logClick(r.deviceId)}
                        className="hover:underline"
                      >
                        {r.deviceId}
                      </Link>
                    </th>
                    <td className="px-3 py-2">{r.category}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {zoneLabel(r.zone)} · {r.subzone} · {r.chainageKm.toFixed(1)} km
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {r.batteryPct != null ? `${r.batteryPct}%` : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                      {r.lastSeenUtc ? <TimeAgo iso={r.lastSeenUtc} /> : "Never"}
                    </td>
                    <td className="px-3 py-2">
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
      </section>
    </div>
  );
}

export default DeviceSearch;

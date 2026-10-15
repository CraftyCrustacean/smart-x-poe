import { useEffect } from "react";
import { useSearchParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useDashboardSummary, useThresholds } from "../api/dashboard";
import {
  CategoryStrip,
  StatTiles,
  StatTilesSkeleton,
} from "../components/dashboard/StatTiles";
import CardBoundary from "../components/dashboard/CardBoundary";
import { ErrorNotice } from "../components/dashboard/LoadState";
import RecentAlerts from "../components/dashboard/RecentAlerts";
import MetricByZoneChart from "../components/dashboard/MetricByZoneChart";
import SegmentedToggle from "../components/dashboard/SegmentedToggle";
import ScopeSummaryTable from "../components/dashboard/ScopeSummaryTable";
import SubzoneMetricGrid from "../components/dashboard/SubzoneMetricGrid";
import SearchPanel from "../components/search/SearchPanel";
import { METRICS, ZONE_ORDER, zoneLabel } from "../lib/format";
import { withoutSearch } from "../lib/search";

const QUERY_STORAGE_KEY = "command-stream-query";

function readStoredQuery() {
  try {
    return sessionStorage.getItem(QUERY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function CommandStream() {
  const {
    data: summary,
    isLoading,
    error,
    refetch: refetchSummary,
  } = useDashboardSummary();
  const thresholds = useThresholds();
  const thresholdsMissing = thresholds.isError;
  const [params, setParams] = useSearchParams();
  const zone = params.get("zone");
  const range = params.get("range") === "30" ? 30 : 7;
  const metric = METRICS[params.get("metric")]
    ? params.get("metric")
    : "flow_rate_lps";
  const stat =
    params.get("stat") === "worst" && !thresholdsMissing ? "worst" : "average";
  const shownZone = ZONE_ORDER.includes(params.get("show"))
    ? params.get("show")
    : null;
  const sort = params.get("sort") === "severity" ? "severity" : "newest";
  const query = params.toString();
  const storedQuery = query ? null : readStoredQuery();

  useEffect(() => {
    if (!query) return;
    try {
      sessionStorage.setItem(
        QUERY_STORAGE_KEY,
        withoutSearch(new URLSearchParams(query)).toString(),
      );
    } catch {
      // If can't store in sessionStorage, just don't persist the filters.
    }
  }, [query]);

  const setView = (key, value) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === "") next.delete(key);
        else next.set(key, String(value));
        return next;
      },
      { replace: true },
    );

  const selectZone = (z) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("zone", z);
      return next;
    });

  const zoneHref = (z) => {
    const next = new URLSearchParams(params);
    next.set("zone", z);
    return `?${next}`;
  };

  const overviewParams = new URLSearchParams(params);
  overviewParams.delete("zone");
  overviewParams.set("range", String(range));
  const overviewLink = `?${overviewParams}`;

  const viewKey = `${zone}|${metric}|${stat}|${range}|${shownZone}`;

  if (storedQuery) return <Navigate to={`?${storedQuery}`} replace />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Real-Time Command Stream and History
        </h1>
        <p className="text-slate-500">
          Live network health, updated as each simulated day closes.
        </p>
      </div>

      <CardBoundary what="network summary">
        {error && !summary ? (
          <ErrorNotice
            message="Couldn't load the network summary."
            error={error}
            onRetry={refetchSummary}
          />
        ) : isLoading ? (
          <StatTilesSkeleton />
        ) : (
          summary && (
            <div className="space-y-6">
              <StatTiles summary={summary} />
              <CategoryStrip categories={summary.categories} />
            </div>
          )
        )}
      </CardBoundary>

      <CardBoundary what="device search">
        <SearchPanel />
      </CardBoundary>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <section className="bg-white border border-slate-300 rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
                  {zone ? (
                    <>
                      <Link to={overviewLink} className="hover:underline">
                        All zones
                      </Link>{" "}
                      / {zoneLabel(zone)}
                    </>
                  ) : (
                    "All zones"
                  )}
                </nav>
                <h2 className="text-lg font-semibold text-slate-900">
                  {stat === "average" ? "Average" : "Worst-sensor"}{" "}
                  {METRICS[metric].label.toLowerCase()} by{" "}
                  {zone ? "subzone" : "zone"}
                </h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <label className="sr-only" htmlFor="metric-select">
                Metric
              </label>
              <select
                id="metric-select"
                value={metric}
                onChange={(e) => setView("metric", e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
              >
                {Object.entries(METRICS).map(([key, m]) => (
                  <option key={key} value={key}>
                    {m.label}
                  </option>
                ))}
              </select>
              {!zone && (
                <>
                  <label className="sr-only" htmlFor="zone-filter">
                    Zone
                  </label>
                  <select
                    id="zone-filter"
                    value={shownZone ?? ""}
                    onChange={(e) => setView("show", e.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
                  >
                    <option value="">All zones</option>
                    {ZONE_ORDER.map((z) => (
                      <option key={z} value={z}>
                        {zoneLabel(z)}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <SegmentedToggle
                label="Statistic"
                value={stat}
                onChange={(v) => setView("stat", v)}
                options={[
                  { value: "average", label: "Average" },
                  {
                    value: "worst",
                    label: "Worst sensor",
                    disabled: thresholdsMissing,
                    title: thresholdsMissing
                      ? "Unavailable: thresholds couldn't be loaded"
                      : undefined,
                  },
                ]}
              />
              <SegmentedToggle
                label="Time range"
                value={range}
                onChange={(v) => setView("range", v)}
                options={[
                  { value: 7, label: "Week" },
                  { value: 30, label: "Month" },
                ]}
              />
              {zone && (
                <Link
                  to={overviewLink}
                  className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-orange-50 transition-colors"
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                  All zones
                </Link>
              )}
            </div>
            {thresholdsMissing && (
              <div className="mb-4">
                <ErrorNotice
                  message="Thresholds couldn't be loaded, so Worst sensor and threshold markers are unavailable."
                  error={thresholds.error}
                  onRetry={thresholds.refetch}
                />
              </div>
            )}
            <CardBoundary what="chart" resetKey={viewKey}>
              {zone ? (
                <SubzoneMetricGrid
                  zone={zone}
                  metric={metric}
                  stat={stat}
                  range={range}
                />
              ) : (
                <MetricByZoneChart
                  metric={metric}
                  stat={stat}
                  range={range}
                  shownZone={shownZone}
                  onSelectZone={selectZone}
                />
              )}
            </CardBoundary>
          </section>

          <section className="bg-white border border-slate-300 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              Latest day {zone ? `in ${zoneLabel(zone)}` : "by zone"}
            </h2>
            <CardBoundary what="table" resetKey={zone}>
              <ScopeSummaryTable zone={zone} onSelectZone={selectZone} />
            </CardBoundary>
          </section>
        </div>
        <CardBoundary
          what="alerts list"
          className="bg-white border border-slate-300 rounded-lg p-4"
        >
          <RecentAlerts
            sort={sort}
            onSortChange={(v) => setView("sort", v)}
            zoneHref={zoneHref}
          />
        </CardBoundary>
      </div>
    </div>
  );
}

export default CommandStream;

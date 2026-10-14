import { useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSnapshotSeries, useThresholds } from "../../api/dashboard";
import {
  formatValue,
  METRICS,
  paddedDomain,
  pickStat,
  zoneColour,
} from "../../lib/format";
import ChartTooltip from "./ChartTooltip";
import { ErrorNotice, Loading, Skeleton } from "./LoadState";

export default function SubzoneMetricGrid({ zone, metric, stat, range }) {
  const {
    data: series = [],
    isLoading,
    error,
    refetch,
  } = useSnapshotSeries(metric, zone, range);
  const { data: thresholds } = useThresholds();
  const threshold = thresholds?.[METRICS[metric].thresholdKey];
  const [hovered, setHovered] = useState(null);

  if (isLoading)
    return (
      <Loading
        label="Loading subzones…"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[122px] rounded-md" />
        ))}
      </Loading>
    );
  if (error && series.length === 0)
    return (
      <ErrorNotice
        message="Couldn't load the subzone data."
        error={error}
        onRetry={refetch}
      />
    );

  const valueOf = (summary) => pickStat(summary, stat, threshold);
  const values = series.flatMap((s) => s.points.map((p) => valueOf(p.summary)));
  if (values.length === 0)
    return (
      <p className="text-sm text-slate-500">
        Waiting for the first batch to close…
      </p>
    );

  const domain = paddedDomain(values, null, 0.05);
  const format = (v) => formatValue(metric, v);
  const statLabel = stat === "average" ? "Average" : "Worst sensor";

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {series.map((s, i) => {
        const latest = s.points.at(-1)?.summary;
        const fillId = `subzone-fill-${zone}-${i}`;
        return (
          <article
            key={s.subzone}
            className="border border-slate-200 rounded-md p-3"
            onMouseEnter={() => setHovered(s.subzone)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-baseline justify-between">
              <h3 className="font-medium text-slate-900">{s.subzone}</h3>
              <span className="text-sm tabular-nums text-slate-900">
                {latest ? format(valueOf(latest)) : "—"}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {latest?.breaching
                ? `${latest.breaching} reading(s) past ${
                    threshold ? format(threshold.critical) : "threshold"
                  }`
                : "No readings past threshold"}
            </p>
            <ResponsiveContainer width="100%" height={56}>
              <AreaChart
                data={s.points.map((p) => ({
                  t: p.batchTimestamp,
                  v: valueOf(p.summary),
                }))}
              >
                <defs>
                  <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={zoneColour(zone)}
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="100%"
                      stopColor={zoneColour(zone)}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis hide domain={domain} allowDataOverflow />
                <Tooltip
                  active={hovered === s.subzone ? undefined : false}
                  content={<ChartTooltip format={format} />}
                  isAnimationActive={false}
                  cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
                />
                <Area
                  dataKey="v"
                  name={statLabel}
                  type="monotone"
                  stroke={zoneColour(zone)}
                  strokeWidth={2}
                  fill={`url(#${fillId})`}
                  baseValue="dataMin"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            {/* TODO: Subzone commands */}
          </article>
        );
      })}
    </div>
  );
}

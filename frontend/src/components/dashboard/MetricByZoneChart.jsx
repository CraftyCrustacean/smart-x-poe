import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSnapshotSeries, useThresholds } from "../../api/dashboard";
import {
  criticalInView,
  formatShortDate,
  formatValue,
  METRICS,
  paddedDomain,
  pickStat,
  zoneColour,
  zoneLabel,
} from "../../lib/format";
import ChartTooltip from "./ChartTooltip";
import { ErrorNotice, Loading, Skeleton } from "./LoadState";

function toRows(series, valueOf) {
  const rows = new Map();
  for (const s of series) {
    for (const p of s.points) {
      const row = rows.get(p.batchTimestamp) ?? { t: p.batchTimestamp };
      row[s.zone] = valueOf(p.summary);
      rows.set(p.batchTimestamp, row);
    }
  }
  return [...rows.values()].sort((a, b) => new Date(a.t) - new Date(b.t));
}

const AXIS = { fill: "#94a3b8", fontSize: 12 };
const OVERVIEW_PADDING = 0.4;

function ChartLegend({ payload, onSelect }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 pb-3 text-xs text-slate-600">
      {payload?.map((entry) => (
        <li key={entry.value}>
          <button
            type="button"
            onClick={() => onSelect(entry.dataKey)}
            title={`View ${entry.value} by subzone`}
            className="flex items-center gap-1.5 hover:text-slate-900 hover:underline"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            {entry.value}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function MetricByZoneChart({
  metric,
  stat,
  range,
  shownZone,
  onSelectZone,
}) {
  const {
    data: allSeries = [],
    isLoading,
    error,
    refetch,
  } = useSnapshotSeries(metric, null, range);
  const series = shownZone
    ? allSeries.filter((s) => s.zone === shownZone)
    : allSeries;
  const { data: thresholds } = useThresholds();
  const threshold = thresholds?.[METRICS[metric].thresholdKey];
  const rows = toRows(series, (summary) => pickStat(summary, stat, threshold));

  if (isLoading)
    return (
      <Loading label="Loading chart…" className="flex h-[300px] flex-col gap-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="flex-1" />
      </Loading>
    );
  if (error && rows.length === 0)
    return (
      <ErrorNotice
        message="Couldn't load the chart data."
        error={error}
        onRetry={refetch}
      />
    );
  if (rows.length === 0)
    return (
      <p className="text-sm text-slate-500">
        Waiting for the first batch to close…
      </p>
    );

  const values = rows.flatMap((r) =>
    series.map((s) => r[s.zone]).filter((v) => v != null),
  );
  const critical = threshold?.critical;
  const showCritical = criticalInView(values, critical);
  const digits = METRICS[metric].digits;
  const format = (v) => formatValue(metric, v);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid
          stroke="#e2e8f0"
          strokeDasharray="3 4"
          vertical={false}
        />
        <XAxis
          dataKey="t"
          tickFormatter={formatShortDate}
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          minTickGap={24}
        />
        <YAxis
          width={48}
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          tickMargin={6}
          domain={paddedDomain(values, critical, OVERVIEW_PADDING)}
          tickFormatter={(v) => v.toFixed(digits)}
          allowDataOverflow
        />
        <Tooltip
          content={<ChartTooltip format={format} />}
          isAnimationActive={false}
          cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
        />
        <Legend
          verticalAlign="top"
          align="left"
          content={<ChartLegend onSelect={onSelectZone} />}
        />
        {showCritical && (
          <ReferenceLine
            y={critical}
            stroke="#ef4444"
            strokeOpacity={0.7}
            strokeDasharray="6 6"
          />
        )}
        {series.map((s) => (
          <Line
            key={s.zone}
            type="monotone"
            dataKey={s.zone}
            name={zoneLabel(s.zone)}
            stroke={zoneColour(s.zone)}
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              strokeWidth: 2,
              stroke: "#fff",
              cursor: "pointer",
              onClick: () => onSelectZone(s.zone),
            }}
            isAnimationActive={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

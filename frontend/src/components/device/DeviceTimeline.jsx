import {
  Line,
  LineChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useThresholds } from "../../api/dashboard";
import { useDeviceReadings } from "../../api/devices";
import {
  formatShortDate,
  formatValue,
  lowIsBad,
  METRICS,
  paddedDomain,
  zoneColour,
} from "../../lib/format";
import ChartTooltip from "../dashboard/ChartTooltip";
import { ErrorNotice, Loading, Skeleton } from "../dashboard/LoadState";

const CHART_METRICS = {
  Environmental: [
    "elevation_change_mm",
    "surface_temperature_c",
    "colour_shift_index",
  ],
  FlowRate: ["flow_rate_lps"],
};

const AXIS = { fill: "#94a3b8", fontSize: 12 };

function MetricTimeline({ readings, metric, threshold, colour }) {
  const meta = METRICS[metric];
  const data = readings.map((r) => ({ t: r.timestamp, v: r[metric] }));
  const values = data.map((d) => d.v);
  const domain = paddedDomain(
    threshold ? [...values, threshold.critical] : values,
  );
  const format = (v) => formatValue(metric, v);
  const dangerBelow = threshold && lowIsBad(threshold);
  const dangerId = `danger-${metric}`;

  return (
    <figure>
      <figcaption className="mb-1 text-sm font-medium text-slate-700">
        {meta.label}
        {meta.unit && <span className="text-slate-500"> ({meta.unit})</span>}
      </figcaption>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={data}
          margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        >
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
            minTickGap={24}
          />
          <YAxis
            width={44}
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            domain={domain}
            tickFormatter={(v) => v.toFixed(meta.digits)}
          />
          <Tooltip
            content={<ChartTooltip format={format} />}
            isAnimationActive={false}
            cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
          />
          {threshold && (
            <defs>
              <linearGradient id={dangerId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset={dangerBelow ? "0%" : "60%"}
                  stopColor="#ef4444"
                  stopOpacity={dangerBelow ? 0.1 : 0}
                />
                <stop
                  offset={dangerBelow ? "40%" : "100%"}
                  stopColor="#ef4444"
                  stopOpacity={dangerBelow ? 0 : 0.1}
                />
              </linearGradient>
            </defs>
          )}
          {threshold && (
            <ReferenceArea
              y1={dangerBelow ? domain[0] : threshold.critical}
              y2={dangerBelow ? threshold.critical : domain[1]}
              fill={`url(#${dangerId})`}
              fillOpacity={1}
              ifOverflow="hidden"
            />
          )}
          {threshold && (
            <ReferenceLine
              y={threshold.critical}
              stroke="#ef4444"
              strokeDasharray="6 6"
              label={{
                value: `Critical ${format(threshold.critical)}`,
                position: "insideBottomRight",
                fill: "#b91c1c",
                fontSize: 11,
              }}
            />
          )}
          <Line
            dataKey="v"
            name={meta.label}
            stroke={colour}
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}

function ValveTimeline({ readings, colour }) {
  const data = readings.map((r) => ({
    t: r.timestamp,
    v: r.valve_open ? 1 : 0,
  }));
  const label = (v) => (v ? "Open" : "Closed");

  return (
    <figure>
      <figcaption className="mb-1 text-sm font-medium text-slate-700">
        Valve state
      </figcaption>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
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
            minTickGap={24}
          />
          <YAxis
            width={52}
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            domain={[0, 1]}
            ticks={[0, 1]}
            tickFormatter={label}
          />
          <Tooltip
            content={<ChartTooltip format={label} />}
            isAnimationActive={false}
          />
          <Line
            type="stepAfter"
            dataKey="v"
            name="Valve"
            stroke={colour}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}

export default function DeviceTimeline({ deviceId, category, zone }) {
  const {
    data: readings = [],
    isLoading,
    error,
    refetch,
  } = useDeviceReadings(deviceId);
  const { data: thresholds } = useThresholds();

  if (isLoading)
    return (
      <Loading label="Loading timeline…">
        <Skeleton className="h-[180px]" />
      </Loading>
    );
  if (error)
    return (
      <ErrorNotice
        message="Couldn't load the timeline."
        error={error}
        onRetry={refetch}
      />
    );
  if (readings.length === 0)
    return <p className="text-sm text-slate-500">No readings received yet.</p>;

  const colour = zoneColour(zone);

  if (category === "Actuator")
    return <ValveTimeline readings={readings} colour={colour} />;

  const metrics = CHART_METRICS[category] ?? [];
  return (
    <>
      <div
        className={`grid gap-6 ${metrics.length > 1 ? "lg:grid-cols-3" : ""}`}
      >
        {metrics.map((m) => (
          <MetricTimeline
            key={m}
            readings={readings}
            metric={m}
            threshold={thresholds?.[METRICS[m].thresholdKey]}
            colour={colour}
          />
        ))}
      </div>
      {thresholds && (
        <p className="mt-3 text-xs text-slate-500">
          Shaded area marks readings past the critical threshold.
        </p>
      )}
    </>
  );
}

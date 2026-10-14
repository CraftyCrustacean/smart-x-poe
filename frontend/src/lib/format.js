export const API_BASE = "http://localhost:8080";

export const METRICS = {
  flow_rate_lps: {
    label: "Flow rate",
    unit: "L/s",
    digits: 1,
    thresholdKey: "flowRateLps",
  },
  elevation_change_mm: {
    label: "Elevation change",
    unit: "mm",
    digits: 1,
    thresholdKey: "elevationChangeMm",
  },
  surface_temperature_c: {
    label: "Surface temp.",
    unit: "°C",
    digits: 1,
    thresholdKey: "surfaceTemperatureC",
  },
  colour_shift_index: {
    label: "Colour shift",
    unit: "",
    digits: 2,
    thresholdKey: "colourShiftIndex",
  },
};

export const THRESHOLD_METRICS = Object.keys(METRICS);

export const metricLabel = (metric) => METRICS[metric]?.label ?? metric;

export const formatValue = (metric, value) => {
  const meta = METRICS[metric];
  if (!meta) return String(value);
  return `${value.toFixed(meta.digits)}${meta.unit ? ` ${meta.unit}` : ""}`;
};

export const ZONE_ORDER = [
  "richards_bay_durban",
  "sasolburg_durban",
  "durban_johannesburg_a",
  "durban_johannesburg_b",
];
const ZONE_COLOURS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];
export const zoneColour = (zone) =>
  ZONE_COLOURS[ZONE_ORDER.indexOf(zone)] ?? "#64748b";

export const zoneLabel = (zone) =>
  zone
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const formatSimDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const formatShortDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

export const lowIsBad = (threshold) => threshold.critical < threshold.normal;

export const pickStat = (summary, stat, threshold) => {
  if (stat === "average" || !threshold) return summary.average;
  return lowIsBad(threshold) ? summary.min : summary.max;
};

export function criticalInView(values, critical) {
  if (critical == null || values.length === 0) return false;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo;
  return critical >= lo - span && critical <= hi + span;
}

export function paddedDomain(values, critical, padRatio = 0.15) {
  const all = criticalInView(values, critical) ? [...values, critical] : values;
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * padRatio || 1;
  return [lo - pad, hi + pad];
}

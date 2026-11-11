import { formatValue, METRICS } from "./format";

export const READING_COLUMNS = {
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

export const readingHeader = (metric) => METRICS[metric]?.label ?? HEADERS[metric];

export function displayReading(metric, value) {
  if (metric === "battery_level_pct") return `${value}%`;
  if (metric === "valve_open") return value ? "Open" : "Closed";
  return formatValue(metric, value);
}

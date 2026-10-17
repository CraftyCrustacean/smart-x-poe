import { COMMANDS, commandLabel, describeTarget } from "./commands";
import { formatValue, metricLabel } from "./format";

export const insightDetail = (s) => {
  const { type, metric, value, deviceId } = s.cause;
  const on = deviceId === s.deviceId ? "" : ` on ${deviceId}`;
  switch (type) {
    case "Breach":
      return `${metricLabel(metric)} passed critical threshold${on}. Reading: ${formatValue(metric, value)}`;
    case "Drift":
      return `${metricLabel(metric)} nearing critical threshold. Reading: ${formatValue(metric, value)}`;
    case "Offline":
      return `Offline for ${value} batches.`;
    case "Battery":
      return `Battery low. Reading: ${value}%`;
    default:
      return null;
  }
};

export const insightTitle = (s) =>
  s.action === "Inspect"
    ? `Inspect ${s.deviceId}`
    : `${commandLabel(s.action, s.target)} · ${describeTarget(s.target)}`;

export const actionLabel = (action) =>
  action === "Inspect" ? "Open the device" : (COMMANDS[action]?.label ?? action);

export const scopeLabel = (scope) => {
  if (scope === "Device") return "on the alerting device";
  if (scope === "Subzone") return "on its whole subzone";
  return `on the ${scope} at the same point`;
};

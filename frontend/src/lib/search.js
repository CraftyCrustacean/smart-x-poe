export const CATEGORIES = ["Environmental", "Actuator", "FlowRate"];

export const ALERT_OPTIONS = [
  { value: "all", label: "Any state" },
  { value: "critical", label: "Critical alert" },
  { value: "disconnected", label: "Disconnected" },
  { value: "any", label: "Alert or disconnected" },
];

export const SEARCH_SORTS = [
  { value: "alerts", label: "Alerts first" },
  { value: "severity", label: "Severity" },
  { value: "battery", label: "Lowest battery" },
  { value: "lastseen", label: "Longest silent" },
];

export const FILTER_KEYS = ["q", "cat", "alert", "szone", "ssub", "low", "ovr"];
export const SEARCH_KEYS = [...FILTER_KEYS, "ssort", "spage"];

export const isSearching = (params) =>
  FILTER_KEYS.some((k) => params.getAll(k).some((v) => v !== "" && v !== "all"));

export function toApiQuery(params) {
  const api = new URLSearchParams();
  if (params.get("q")) api.set("q", params.get("q"));
  params.getAll("cat").forEach((c) => api.append("category", c));
  const alert = params.get("alert");
  if (alert && alert !== "all") api.set("alert", alert);
  if (params.get("szone")) api.set("zone", params.get("szone"));
  if (params.get("ssub")) api.set("subzone", params.get("ssub"));
  if (params.get("low") === "1") api.set("lowBattery", "true");
  if (params.get("ovr") === "1") api.set("override", "true");
  api.set("sort", params.get("ssort") ?? "alerts");
  api.set("page", params.get("spage") ?? "1");
  return api;
}

export function filterSnapshot(params) {
  const snapshot = {};
  for (const key of FILTER_KEYS) {
    const values = params.getAll(key).filter((v) => v !== "" && v !== "all");
    if (values.length) snapshot[key] = values;
  }
  return snapshot;
}

export function withoutSearch(params) {
  const next = new URLSearchParams(params);
  SEARCH_KEYS.forEach((k) => next.delete(k));
  return next;
}

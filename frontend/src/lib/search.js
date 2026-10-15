export const CATEGORIES = ["Environmental", "Actuator", "FlowRate"];

export const ALERT_OPTIONS = [
  { value: "all", label: "Any state" },
  { value: "critical", label: "Critical alert" },
  { value: "disconnected", label: "Disconnected" },
  { value: "any", label: "Alert or disconnected" },
];

export const SORT_COLUMNS = {
  id: { label: "Device ID", firstDir: "asc" },
  category: { label: "Category", firstDir: "asc" },
  location: { label: "Location", firstDir: "asc" },
  battery: { label: "Battery", firstDir: "asc" },
  status: { label: "Status", firstDir: "desc" },
};

export const VIEW_KEYS = ["sort", "dir", "page"];

export const SEARCH_PATH = "/devices";

export const LOCATION_KEYS = ["zone", "subzone"];
export const FILTER_KEYS = ["q", "cat", "alert", ...LOCATION_KEYS, "kmin", "kmax", "low", "ovr"];
export const SEARCH_KEYS = [...FILTER_KEYS, ...VIEW_KEYS];

const isSet = (v) => v.trim() !== "" && v !== "all";

export const activeFilters = (params, keys = FILTER_KEYS) =>
  keys.filter((k) => params.getAll(k).some(isSet));

export const showsResults = (params) =>
  Boolean(params.get("subzone")) ||
  activeFilters(params).some((k) => !LOCATION_KEYS.includes(k));

export function withChanges(params, changes, { resetPage = true } = {}) {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(changes)) {
    next.delete(key);
    for (const v of [].concat(value ?? []))
      if (v !== "" && v != null) next.append(key, String(v));
  }
  if (resetPage) next.delete("page");
  return next;
}

export function toApiQuery(params) {
  const api = new URLSearchParams();
  if (params.get("q")?.trim()) api.set("q", params.get("q").trim());
  params.getAll("cat").forEach((c) => api.append("category", c));
  const alert = params.get("alert");
  if (alert && alert !== "all") api.set("alert", alert);
  if (params.get("zone")) api.set("zone", params.get("zone"));
  if (params.get("subzone")) api.set("subzone", params.get("subzone"));
  if (params.get("kmin")) api.set("minKm", params.get("kmin"));
  if (params.get("kmax")) api.set("maxKm", params.get("kmax"));
  if (params.get("low") === "1") api.set("lowBattery", "true");
  if (params.get("ovr") === "1") api.set("override", "true");
  if (SORT_COLUMNS[params.get("sort")]) {
    api.set("sort", params.get("sort"));
    api.set("dir", params.get("dir") === "desc" ? "desc" : "asc");
  }
  api.set("page", params.get("page") ?? "1");
  return api;
}

export function filterSnapshot(params) {
  const snapshot = {};
  for (const key of activeFilters(params))
    snapshot[key] = params.getAll(key).map((v) => v.trim()).filter(isSet);
  return snapshot;
}

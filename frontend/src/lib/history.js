export const DEFAULT_DAYS = 30;
export const HISTORY_LIMITS = [50, 100, 500, 1000];
export const DEFAULT_LIMIT = 500;

export const dayOf = (iso) => iso.slice(0, 10);

export function addDays(day, days) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function formatDay(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const formatTime = (iso) => iso.slice(11, 16);

export const formatMicros = (us) => `${us.toFixed(us < 10 ? 1 : 0)} µs`;

export const formatCount = (n) => n.toLocaleString("en-GB");

export function rangeTouchesNewest(queryKey, queryClient) {
  const [, , deviceId, { to, follow }] = queryKey;
  if (follow) return false;
  const newest = queryClient.getQueryData(["history", "bounds", deviceId])?.newest;
  return !newest || to >= dayOf(newest);
}

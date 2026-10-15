import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getJson } from "./dashboard";
import { API_BASE } from "../lib/format";

export const useDeviceSearch = (apiQuery) =>
  useQuery({
    queryKey: ["search", apiQuery.toString()],
    queryFn: () => getJson(`/api/search/devices?${apiQuery}`),
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });

export function logSearchClick(deviceId, filters) {
  fetch(`${API_BASE}/api/search/clicks`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, filters }),
  }).catch(() => {});
}

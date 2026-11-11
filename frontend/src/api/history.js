import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getJson } from "./dashboard";

const historyPath = (deviceId) => `/api/history/${encodeURIComponent(deviceId)}`;

export const useHistoryBounds = (deviceId) =>
  useQuery({
    queryKey: ["history", "bounds", deviceId],
    queryFn: () => getJson(`${historyPath(deviceId)}/bounds`),
    staleTime: Infinity,
    enabled: Boolean(deviceId),
  });

export const useDeviceHistory = (deviceId, { from, to, limit, compare, follow }) =>
  useQuery({
    queryKey: ["history", "range", deviceId, { from, to, limit, compare, follow }],
    queryFn: () => {
      const params = new URLSearchParams({ from, to, limit: String(limit) });
      if (compare) params.set("compare", "true");
      return getJson(`${historyPath(deviceId)}?${params}`);
    },
    staleTime: Infinity,
    placeholderData: keepPreviousData,
    enabled: Boolean(deviceId && from && to && from <= to),
  });

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { API_BASE } from "../lib/format";

async function getJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const useDashboardSummary = () =>
  useQuery({
    queryKey: ["dashboardSummary"],
    queryFn: () => getJson("/api/dashboard/summary"),
    staleTime: Infinity,
  });

export const useSnapshotSeries = (metric, zone, points) =>
  useQuery({
    queryKey: ["snapshots", "series", metric, zone ?? "all", points],
    queryFn: () => {
      const params = new URLSearchParams({ metric, points: String(points) });
      if (zone) params.set("zone", zone);
      return getJson(`/api/snapshots/series?${params}`);
    },
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });

export const useLatestSnapshots = (zone) =>
  useQuery({
    queryKey: ["snapshots", "latest", zone ?? "all"],
    queryFn: () =>
      getJson(
        `/api/snapshots/latest${zone ? `?zone=${encodeURIComponent(zone)}` : ""}`,
      ),
    staleTime: Infinity,
  });

export const useThresholds = () =>
  useQuery({
    queryKey: ["thresholds"],
    queryFn: () => getJson("/api/thresholds"),
    staleTime: Infinity,
  });

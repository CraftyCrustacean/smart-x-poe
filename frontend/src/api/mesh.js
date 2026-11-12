import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson } from "./dashboard";
import { postJson } from "./commands";

export const useMeshTopology = () =>
  useQuery({
    queryKey: ["mesh", "topology"],
    queryFn: () => getJson("/api/mesh/topology"),
    staleTime: Infinity,
    gcTime: Infinity,
  });

export const useMeshState = () =>
  useQuery({
    queryKey: ["mesh", "state"],
    queryFn: () => getJson("/api/mesh/state"),
    staleTime: Infinity,
  });

export function useMeshData() {
  const queryClient = useQueryClient();
  const topology = useMeshTopology();
  const state = useMeshState();

  const ready =
    Boolean(topology.data && state.data) &&
    topology.data.vertexCount === state.data.summary.vertexCount;
  const stale = Boolean(topology.data && state.data) && !ready;

  useEffect(() => {
    if (stale) queryClient.invalidateQueries({ queryKey: ["mesh", "topology"] });
  }, [stale, queryClient]);

  return {
    topology: topology.data,
    state: state.data,
    ready,
    error: topology.error ?? state.error,
    refetch: () => {
      topology.refetch();
      state.refetch();
    },
  };
}

export const useMeshRoute = (deviceId) =>
  useQuery({
    queryKey: ["mesh", "route", deviceId],
    queryFn: () => getJson(`/api/mesh/routes/${encodeURIComponent(deviceId)}`),
    staleTime: Infinity,
    enabled: Boolean(deviceId),
  });

export const useReachability = (params = {}) =>
  useQuery({
    queryKey: ["mesh", "reachability", params],
    queryFn: () => {
      const search = new URLSearchParams(
        Object.entries(params).filter(([, value]) => value),
      );
      return getJson(`/api/mesh/reachability${search.size ? `?${search}` : ""}`);
    },
    staleTime: Infinity,
  });

export const useMeshHealing = () =>
  useQuery({
    queryKey: ["mesh", "healing"],
    queryFn: () => getJson("/api/mesh/healing"),
    staleTime: Infinity,
  });

function useRefreshMesh() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: ["mesh"],
      predicate: (query) => query.queryKey[1] !== "topology",
    });
}

export const useSetFailure = () => {
  const refresh = useRefreshMesh();
  return useMutation({
    mutationFn: (request) => postJson("/api/mesh/failures", request),
    onSuccess: refresh,
  });
};

export const useRestoreFailure = () => {
  const refresh = useRefreshMesh();
  return useMutation({
    mutationFn: (request = {}) => postJson("/api/mesh/failures/restore", request),
    onSuccess: refresh,
  });
};

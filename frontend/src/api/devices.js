import { useQuery } from "@tanstack/react-query";
import { getJson } from "./dashboard";

export const useDeviceLive = (deviceId) =>
  useQuery({
    queryKey: ["device", deviceId, "live"],
    queryFn: () =>
      getJson(`/api/devices/${encodeURIComponent(deviceId)}/state`),
    staleTime: Infinity,
    enabled: Boolean(deviceId),
  });

export const useDeviceReadings = (deviceId) =>
  useQuery({
    queryKey: ["device", deviceId, "readings"],
    queryFn: () =>
      getJson(`/api/devices/${encodeURIComponent(deviceId)}/readings`),
    staleTime: Infinity,
  });

export const useDevices = () =>
  useQuery({
    queryKey: ["devices"],
    queryFn: () => getJson("/api/devices"),
  });

export const useDeviceFiles = (deviceId) =>
  useQuery({
    queryKey: ["files", deviceId],
    queryFn: () =>
      getJson(`/api/devices/${encodeURIComponent(deviceId)}/files`),
  });

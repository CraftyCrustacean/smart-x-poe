import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson } from "./dashboard";
import { API_BASE } from "../lib/format";

async function postJson(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? `${res.status} ${res.statusText}`);
  return data;
}

export const useCommandHistory = () =>
  useQuery({
    queryKey: ["commands"],
    queryFn: () => getJson("/api/commands"),
    staleTime: Infinity,
  });

function useRefreshAfterCommand() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["commands"] });
    queryClient.invalidateQueries({ queryKey: ["device"] });
  };
}

export const useIssueCommand = () => {
  const refresh = useRefreshAfterCommand();
  return useMutation({
    mutationFn: (request) => postJson("/api/commands", request),
    onSuccess: refresh,
  });
};

export const useUndoCommand = () => {
  const refresh = useRefreshAfterCommand();
  return useMutation({
    mutationFn: () => postJson("/api/commands/undo"),
    onSuccess: refresh,
  });
};

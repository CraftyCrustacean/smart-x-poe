import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getJson } from "./dashboard";
import { postJson } from "./commands";

export const useInsights = (type) =>
  useQuery({
    queryKey: ["insights", "suggestions", type ?? "all"],
    queryFn: () =>
      getJson(
        type
          ? `/api/insights?type=${encodeURIComponent(type)}`
          : "/api/insights",
      ),
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });

export const useInsightModel = () =>
  useQuery({
    queryKey: ["insights", "model"],
    queryFn: () => getJson("/api/insights/model"),
    staleTime: Infinity,
  });

export const useDismissInsight = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => postJson("/api/insights/dismiss", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["insights"] }),
  });
};

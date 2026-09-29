import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPost } from "@/lib/api-client";
import type { Insight } from "@/types/insight";

export function useInsights() {
  return useQuery({
    queryKey: ["insights"],
    queryFn: () => apiFetch<Insight[]>("/api/insights"),
  });
}

export function useGenerateInsights() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<Insight[]>("/api/insights"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["insights"] }),
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteProjectFinding,
  dismissProjectFinding,
  getProjectFindings,
  resolveProjectFinding,
} from "@/services/api/findings";
import type { FindingListFilters } from "@/types/finding";

export const findingKeys = {
  all: ["findings"] as const,
  project: (projectId: string) => [...findingKeys.all, "project", projectId] as const,
  list: (projectId: string, filters: FindingListFilters) => [...findingKeys.project(projectId), "list", filters] as const,
};

export function useProjectFindingsQuery(projectId: string | undefined, filters: FindingListFilters = {}) {
  return useQuery({
    queryKey: projectId ? findingKeys.list(projectId, filters) : [...findingKeys.all, "missing"],
    queryFn: () => getProjectFindings(projectId ?? "", filters),
    enabled: Boolean(projectId),
    refetchInterval: 5_000,
  });
}

export function useDismissFindingMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (findingId: string) => dismissProjectFinding(projectId, findingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: findingKeys.project(projectId) });
    },
  });
}

export function useResolveFindingMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (findingId: string) => resolveProjectFinding(projectId, findingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: findingKeys.project(projectId) });
    },
  });
}

export function useDeleteFindingMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (findingId: string) => deleteProjectFinding(projectId, findingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: findingKeys.project(projectId) });
    },
  });
}


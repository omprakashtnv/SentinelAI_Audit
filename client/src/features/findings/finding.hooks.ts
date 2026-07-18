import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteProjectFinding,
  dismissProjectFinding,
  getProjectFindingFixPreview,
  getProjectFinding,
  getProjectFindingExplanation,
  getProjectFindings,
  resolveProjectFinding,
} from "@/services/api/findings";
import type { FindingListFilters } from "@/types/finding";

export const findingKeys = {
  all: ["findings"] as const,
  project: (projectId: string) => [...findingKeys.all, "project", projectId] as const,
  list: (projectId: string, filters: FindingListFilters) => [...findingKeys.project(projectId), "list", filters] as const,
  detail: (projectId: string, findingId: string) => [...findingKeys.project(projectId), "detail", findingId] as const,
  explanation: (projectId: string, findingId: string) =>
    [...findingKeys.detail(projectId, findingId), "explanation"] as const,
  fixPreview: (projectId: string, findingId: string) =>
    [...findingKeys.detail(projectId, findingId), "fix-preview"] as const,
};

export function useProjectFindingQuery(projectId: string | undefined, findingId: string | undefined) {
  return useQuery({
    queryKey:
      projectId && findingId
        ? findingKeys.detail(projectId, findingId)
        : [...findingKeys.all, "detail", "missing"],
    queryFn: () => getProjectFinding(projectId ?? "", findingId ?? ""),
    enabled: Boolean(projectId && findingId),
  });
}

export function useProjectFindingExplanationQuery(projectId: string | undefined, findingId: string | undefined) {
  return useQuery({
    queryKey:
      projectId && findingId
        ? findingKeys.explanation(projectId, findingId)
        : [...findingKeys.all, "explanation", "missing"],
    queryFn: () => getProjectFindingExplanation(projectId ?? "", findingId ?? ""),
    enabled: Boolean(projectId && findingId),
  });
}

export function useProjectFindingFixPreviewQuery(projectId: string | undefined, findingId: string | undefined) {
  return useQuery({
    queryKey:
      projectId && findingId
        ? findingKeys.fixPreview(projectId, findingId)
        : [...findingKeys.all, "fix-preview", "missing"],
    queryFn: () => getProjectFindingFixPreview(projectId ?? "", findingId ?? ""),
    enabled: Boolean(projectId && findingId),
  });
}

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
    onSuccess: (finding) => {
      queryClient.setQueryData(findingKeys.detail(projectId, finding.id), finding);
      void queryClient.invalidateQueries({ queryKey: findingKeys.project(projectId) });
    },
  });
}

export function useResolveFindingMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (findingId: string) => resolveProjectFinding(projectId, findingId),
    onSuccess: (finding) => {
      queryClient.setQueryData(findingKeys.detail(projectId, finding.id), finding);
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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelProjectScan,
  createProjectScan,
  getProjectScans,
  retryProjectScan,
} from "@/services/api/scans";
import type { Scan } from "@/types/scan";
import type { ScanStatus } from "@/types/scan";

export const scanKeys = {
  all: ["scans"] as const,
  project: (projectId: string) => [...scanKeys.all, "project", projectId] as const,
};

const ACTIVE_SCAN_STATUSES: ScanStatus[] = [
  "QUEUED",
  "PARSING",
  "INDEXING",
  "READY_FOR_AI",
  "AI_SCANNING",
  "PROCESSING_RESULTS",
];

export function useProjectScansQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? scanKeys.project(projectId) : [...scanKeys.all, "missing"],
    queryFn: () => getProjectScans(projectId ?? ""),
    enabled: Boolean(projectId),
    refetchInterval: (query) => {
      const latestScan = query.state.data?.scans[0];

      return latestScan && ACTIVE_SCAN_STATUSES.includes(latestScan.status) ? 5_000 : false;
    },
  });
}

export function useCreateProjectScanMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => createProjectScan(projectId),
    onSuccess: (scan) => {
      updateScanCache(queryClient, projectId, scan);
      void queryClient.invalidateQueries({ queryKey: scanKeys.project(projectId) });
    },
  });
}

export function useCancelProjectScanMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scanId: string) => cancelProjectScan(projectId, scanId),
    onSuccess: (scan) => {
      updateScanCache(queryClient, projectId, scan);
      void queryClient.invalidateQueries({ queryKey: scanKeys.project(projectId) });
    },
  });
}

export function useRetryProjectScanMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scanId: string) => retryProjectScan(projectId, scanId),
    onSuccess: (scan) => {
      updateScanCache(queryClient, projectId, scan);
      void queryClient.invalidateQueries({ queryKey: scanKeys.project(projectId) });
    },
  });
}

function updateScanCache(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  scan: Scan,
) {
  queryClient.setQueryData<Awaited<ReturnType<typeof getProjectScans>>>(scanKeys.project(projectId), (current) => {
    if (!current) {
      return {
        scans: [scan],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };
    }

    const scans = [scan, ...current.scans.filter((currentScan) => currentScan.id !== scan.id)];

    return {
      ...current,
      scans,
      meta: {
        ...current.meta,
        total: Math.max(current.meta.total, scans.length),
      },
    };
  });
}


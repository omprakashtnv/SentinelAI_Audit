import { apiEnvelopeRequest, apiRequest } from "@/services/api/api-client";
import type { Scan, ScanListMeta } from "@/types/scan";

type ScanResponse = {
  scan: Scan;
};

type ScanListResponse = {
  scans: Scan[];
};

export async function createProjectScan(projectId: string): Promise<Scan> {
  const response = await apiRequest<ScanResponse>({
    path: `/projects/${projectId}/scans`,
    method: "POST",
  });

  return response.scan;
}

export async function getProjectScans(projectId: string): Promise<{
  scans: Scan[];
  meta: ScanListMeta;
}> {
  const response = await apiEnvelopeRequest<ScanListResponse>({
    path: `/projects/${projectId}/scans`,
    params: {
      page: 1,
      limit: 10,
    },
  });

  return {
    scans: response.data.scans,
    meta: (response.meta ?? {
      page: 1,
      limit: response.data.scans.length,
      total: response.data.scans.length,
      totalPages: 1,
    }) as ScanListMeta,
  };
}

export async function cancelProjectScan(projectId: string, scanId: string): Promise<Scan> {
  const response = await apiRequest<ScanResponse>({
    path: `/projects/${projectId}/scans/${scanId}/cancel`,
    method: "POST",
  });

  return response.scan;
}

export async function retryProjectScan(projectId: string, scanId: string): Promise<Scan> {
  const response = await apiRequest<ScanResponse>({
    path: `/projects/${projectId}/scans/${scanId}/retry`,
    method: "POST",
  });

  return response.scan;
}


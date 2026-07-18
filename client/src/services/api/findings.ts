import { apiEnvelopeRequest, apiRequest } from "@/services/api/api-client";
import type { Finding, FindingListFilters, FindingListMeta } from "@/types/finding";

type FindingResponse = {
  finding: Finding;
};

type FindingListResponse = {
  findings: Finding[];
};

export async function getProjectFindings(
  projectId: string,
  filters: FindingListFilters = {},
): Promise<{
  findings: Finding[];
  meta: FindingListMeta;
}> {
  const response = await apiEnvelopeRequest<FindingListResponse>({
    path: `/projects/${projectId}/findings`,
    params: {
      page: filters.page ?? 1,
      limit: filters.limit ?? 100,
      status: filters.status,
      severity: filters.severity,
      scanId: filters.scanId,
      search: filters.search,
    },
  });

  return {
    findings: response.data.findings,
    meta: (response.meta ?? {
      page: filters.page ?? 1,
      limit: filters.limit ?? response.data.findings.length,
      total: response.data.findings.length,
      totalPages: 1,
    }) as FindingListMeta,
  };
}

export async function dismissProjectFinding(projectId: string, findingId: string): Promise<Finding> {
  const response = await apiRequest<FindingResponse>({
    path: `/projects/${projectId}/findings/${findingId}/dismiss`,
    method: "POST",
  });

  return response.finding;
}

export async function resolveProjectFinding(projectId: string, findingId: string): Promise<Finding> {
  const response = await apiRequest<FindingResponse>({
    path: `/projects/${projectId}/findings/${findingId}/resolve`,
    method: "POST",
  });

  return response.finding;
}

export async function deleteProjectFinding(projectId: string, findingId: string): Promise<void> {
  await apiRequest<null>({
    path: `/projects/${projectId}/findings/${findingId}`,
    method: "DELETE",
  });
}


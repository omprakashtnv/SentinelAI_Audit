import { apiEnvelopeRequest, apiRequest } from "@/services/api/api-client";
import type { FindingFixPreview } from "@/types/fix-preview";
import type { Finding, FindingExplanation, FindingListFilters, FindingListMeta } from "@/types/finding";

type FindingResponse = {
  finding: Finding;
};

type FindingListResponse = {
  findings: Finding[];
};

type FindingExplanationResponse = {
  explanation: FindingExplanation;
};

type FindingFixPreviewResponse = {
  fixPreview: FindingFixPreview;
};

export async function getProjectFinding(projectId: string, findingId: string): Promise<Finding> {
  const response = await apiRequest<FindingResponse>({
    path: `/projects/${projectId}/findings/${findingId}`,
  });

  return response.finding;
}

export async function getProjectFindingExplanation(
  projectId: string,
  findingId: string,
): Promise<FindingExplanation> {
  const response = await apiRequest<FindingExplanationResponse>({
    path: `/projects/${projectId}/findings/${findingId}/explanation`,
  });

  return response.explanation;
}

export async function getProjectFindingFixPreview(
  projectId: string,
  findingId: string,
): Promise<FindingFixPreview> {
  const response = await apiRequest<FindingFixPreviewResponse>({
    path: `/projects/${projectId}/findings/${findingId}/fix-preview`,
  });

  return response.fixPreview;
}

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
      category: filters.category,
      owasp: filters.owasp,
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

import { apiEnvelopeRequest, apiRequest } from "@/services/api/api-client";
import type { FindingFixPreview } from "@/types/fix-preview";
import type {
  Finding,
  FindingExplanation,
  FindingListFilters,
  FindingListMeta,
  FindingListSummary,
} from "@/types/finding";

type FindingResponse = {
  finding: Finding;
};

type FindingListResponse = {
  findings: Finding[];
  summary?: FindingListSummary;
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
  summary: FindingListSummary;
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

  const fallbackMeta = {
      page: filters.page ?? 1,
      limit: filters.limit ?? response.data.findings.length,
      total: response.data.findings.length,
      totalPages: 1,
    } satisfies FindingListMeta;
  const meta = (response.meta ?? fallbackMeta) as FindingListMeta;

  return {
    findings: response.data.findings,
    meta,
    summary: response.data.summary ?? {
      total: meta.total,
      bySeverity: countBySeverity(response.data.findings),
      byOpenSeverity: countBySeverity(response.data.findings.filter((finding) => finding.status === "OPEN")),
      byStatus: countByStatus(response.data.findings),
    },
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

function countBySeverity(findings: Finding[]): FindingListSummary["bySeverity"] {
  return {
    CRITICAL: findings.filter((finding) => finding.severity === "CRITICAL").length,
    HIGH: findings.filter((finding) => finding.severity === "HIGH").length,
    MEDIUM: findings.filter((finding) => finding.severity === "MEDIUM").length,
    LOW: findings.filter((finding) => finding.severity === "LOW").length,
    INFO: findings.filter((finding) => finding.severity === "INFO").length,
  };
}

function countByStatus(findings: Finding[]): FindingListSummary["byStatus"] {
  return {
    OPEN: findings.filter((finding) => finding.status === "OPEN").length,
    DISMISSED: findings.filter((finding) => finding.status === "DISMISSED").length,
    RESOLVED: findings.filter((finding) => finding.status === "RESOLVED").length,
  };
}

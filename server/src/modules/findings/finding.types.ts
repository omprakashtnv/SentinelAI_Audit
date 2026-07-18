import type { Finding, FindingSeverity, FindingStatus, Prisma } from "@prisma/client";

export type PublicFinding = {
  id: string;
  projectId: string;
  scanId: string | null;
  ruleId: string | null;
  severity: FindingSeverity;
  status: FindingStatus;
  title: string;
  description: string;
  file: string;
  line: number;
  category: string | null;
  owasp: string | null;
  recommendation: string | null;
  confidence: string | null;
  metadata: Prisma.JsonValue;
  dismissedAt: string | null;
  resolvedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FindingListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type FindingListResult = {
  findings: PublicFinding[];
  meta: FindingListMeta;
};

export function toPublicFinding(finding: Finding): PublicFinding {
  return {
    id: finding.id,
    projectId: finding.projectId,
    scanId: finding.scanId,
    ruleId: finding.ruleId,
    severity: finding.severity,
    status: finding.status,
    title: finding.title,
    description: finding.description,
    file: finding.file,
    line: finding.line,
    category: finding.category,
    owasp: finding.owasp,
    recommendation: finding.recommendation,
    confidence: finding.confidence,
    metadata: finding.metadata,
    dismissedAt: finding.dismissedAt?.toISOString() ?? null,
    resolvedAt: finding.resolvedAt?.toISOString() ?? null,
    deletedAt: finding.deletedAt?.toISOString() ?? null,
    createdAt: finding.createdAt.toISOString(),
    updatedAt: finding.updatedAt.toISOString(),
  };
}


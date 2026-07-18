import type { Finding, FindingSeverity, FindingStatus, Prisma } from "@prisma/client";
import type { CodeDiffLanguage, CodeDiffResult } from "../code-diff-generator";

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

export type FindingFixPreviewEnhancement = {
  source: "template" | "openai";
  attemptedAi: boolean;
  usedAi: boolean;
  reason: string | null;
  model: string | null;
  responseId: string | null;
};

export type FindingFixPreviewAssurance = {
  fixSource: string;
  confidenceScore: number;
  basedOn: string[];
  verification: string[];
};

export type FindingFixPreview = {
  findingId: string;
  projectId: string;
  ruleId: string | null;
  title: string;
  severity: FindingSeverity;
  status: FindingStatus;
  file: string;
  line: number;
  category: string | null;
  owasp: string | null;
  confidence: string | null;
  explanation: string;
  recommendation: string;
  originalCode: string;
  generatedFix: string;
  language: CodeDiffLanguage;
  patch: CodeDiffResult;
  enhancement: FindingFixPreviewEnhancement;
  assurance: FindingFixPreviewAssurance;
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

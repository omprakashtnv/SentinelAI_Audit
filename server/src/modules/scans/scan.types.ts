import type { Scan, ScanStatus } from "@prisma/client";

import type { SecurityFinding, SecurityScanSummary } from "../rule-based-scanner";
import { ACTIVE_SCAN_STATUSES } from "./scan.constants";

export type PublicScan = {
  id: string;
  projectId: string;
  status: ScanStatus;
  progress: number;
  attempt: number;
  sourceType: string | null;
  sourceRef: string | null;
  totalFilesDiscovered: number;
  parsedFiles: number;
  skippedFiles: number;
  totalParsedBytes: number;
  securityFindings: SecurityFinding[];
  securitySummary: SecurityScanSummary | null;
  failureReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  elapsedMs: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ScanListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ScanListResult = {
  scans: PublicScan[];
  meta: ScanListMeta;
};

export function toPublicScan(scan: Scan): PublicScan {
  return {
    id: scan.id,
    projectId: scan.projectId,
    status: scan.status,
    progress: scan.progress,
    attempt: scan.attempt,
    sourceType: scan.sourceType,
    sourceRef: scan.sourceRef,
    totalFilesDiscovered: scan.totalFilesDiscovered,
    parsedFiles: scan.parsedFiles,
    skippedFiles: scan.skippedFiles,
    totalParsedBytes: scan.totalParsedBytes,
    securityFindings: parseSecurityFindings(scan.securityFindings),
    securitySummary: parseSecuritySummary(scan.securitySummary),
    failureReason: scan.failureReason,
    startedAt: scan.startedAt?.toISOString() ?? null,
    completedAt: scan.completedAt?.toISOString() ?? null,
    cancelledAt: scan.cancelledAt?.toISOString() ?? null,
    elapsedMs: getElapsedMs(scan),
    createdAt: scan.createdAt.toISOString(),
    updatedAt: scan.updatedAt.toISOString(),
  };
}

function parseSecurityFindings(value: unknown): SecurityFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isSecurityFinding);
}

function parseSecuritySummary(value: unknown): SecurityScanSummary | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const summary = value as Partial<Record<keyof SecurityScanSummary, unknown>>;

  if (
    typeof summary.filesScanned !== "number" ||
    typeof summary.findings !== "number" ||
    typeof summary.critical !== "number" ||
    typeof summary.high !== "number" ||
    typeof summary.medium !== "number" ||
    typeof summary.low !== "number"
  ) {
    return null;
  }

  return {
    filesScanned: summary.filesScanned,
    findings: summary.findings,
    critical: summary.critical,
    high: summary.high,
    medium: summary.medium,
    low: summary.low,
  };
}

function isSecurityFinding(value: unknown): value is SecurityFinding {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const finding = value as Partial<Record<keyof SecurityFinding, unknown>>;

  return (
    typeof finding.ruleId === "string" &&
    typeof finding.severity === "string" &&
    typeof finding.title === "string" &&
    typeof finding.description === "string" &&
    typeof finding.file === "string" &&
    typeof finding.line === "number" &&
    typeof finding.category === "string" &&
    typeof finding.owasp === "string" &&
    typeof finding.confidence === "string"
  );
}

function getElapsedMs(scan: Scan): number | null {
  if (scan.elapsedMs !== null) {
    return scan.elapsedMs;
  }

  if (!scan.startedAt || !ACTIVE_SCAN_STATUSES.includes(scan.status as (typeof ACTIVE_SCAN_STATUSES)[number])) {
    return null;
  }

  return Date.now() - scan.startedAt.getTime();
}

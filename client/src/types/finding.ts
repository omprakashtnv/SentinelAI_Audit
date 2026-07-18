export type FindingSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type FindingStatus = "OPEN" | "DISMISSED" | "RESOLVED";
export type FindingConfidence = "HIGH" | "MEDIUM" | "LOW";

export type Finding = {
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
  metadata: unknown;
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

export type FindingListFilters = {
  page?: number;
  limit?: number;
  status?: FindingStatus;
  severity?: FindingSeverity;
  scanId?: string;
  search?: string;
};


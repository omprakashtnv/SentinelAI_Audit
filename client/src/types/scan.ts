export type ScanStatus =
  | "QUEUED"
  | "PARSING"
  | "INDEXING"
  | "READY_FOR_AI"
  | "AI_SCANNING"
  | "PROCESSING_RESULTS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type SecuritySeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type SecurityConfidence = "HIGH" | "MEDIUM" | "LOW";

export type SecurityFinding = {
  ruleId: string;
  severity: SecuritySeverity;
  title: string;
  description: string;
  file: string;
  line: number;
  category: string;
  owasp: string;
  recommendation?: string;
  confidence: SecurityConfidence;
};

export type SecurityScanSummary = {
  filesScanned: number;
  findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
};

export type Scan = {
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

export type ScanProgressSnapshot = {
  scanId: string;
  status: ScanStatus;
  currentStep: string;
  currentFile: string | null;
  percentage: number;
  estimatedTimeRemainingMs: number | null;
  updatedAt: string;
};

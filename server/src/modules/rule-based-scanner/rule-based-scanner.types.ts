import type { IndexedRepositoryFile, RepositoryIndex } from "../file-indexer";

export type SecuritySeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type SecurityConfidence = "HIGH" | "MEDIUM" | "LOW";

export type SecurityCategory =
  | "secrets"
  | "injection"
  | "unsafe_process_execution"
  | "xss"
  | "logging"
  | "configuration"
  | "validation";

export type SecurityFinding = {
  ruleId: string;
  severity: SecuritySeverity;
  title: string;
  description: string;
  file: string;
  line: number;
  category: SecurityCategory;
  owasp: string;
  recommendation?: string;
  confidence: SecurityConfidence;
};

export type SecuritySourceFile = {
  metadata: IndexedRepositoryFile;
  content: string;
  lines: string[];
};

export type SecurityRuleContext = {
  repositoryIndex: RepositoryIndex;
  files: SecuritySourceFile[];
};

export type SecurityRule = {
  id: string;
  scan: (context: SecurityRuleContext) => SecurityFinding[];
};

export type RuleBasedScannerOptions = {
  rules?: SecurityRule[];
};

export type SecurityScanSummary = {
  filesScanned: number;
  findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
};

export type RuleBasedSecurityScanResult = {
  scannedAt: string;
  findings: SecurityFinding[];
  summary: SecurityScanSummary;
};

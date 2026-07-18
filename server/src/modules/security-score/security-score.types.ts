export type SecurityScoreSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type SecurityScoreDomain = "overall" | "authentication" | "authorization" | "database" | "frontend" | "api";

export type SecurityScoreFinding = {
  severity: SecurityScoreSeverity;
  title?: string | null;
  description?: string | null;
  file?: string | null;
  category?: string | null;
  owasp?: string | null;
  status?: string | null;
  deletedAt?: string | Date | null;
};

export type SecurityScoreWeights = Record<SecurityScoreSeverity, number>;

export type SecurityScoreEngineOptions = {
  weights?: Partial<SecurityScoreWeights>;
  startingScore?: number;
  minimumScore?: number;
  maximumScore?: number;
  includeDismissed?: boolean;
  includeResolved?: boolean;
};

export type SecurityScoreBreakdown = {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  totalDeductions: number;
};

export type SecurityDomainScore = {
  score: number;
  findings: number;
  breakdown: SecurityScoreBreakdown;
};

export type SecurityScoreResult = {
  overallScore: number;
  authenticationScore: number;
  authorizationScore: number;
  databaseScore: number;
  frontendScore: number;
  apiScore: number;
  domains: Record<Exclude<SecurityScoreDomain, "overall">, SecurityDomainScore>;
  overall: SecurityDomainScore;
};


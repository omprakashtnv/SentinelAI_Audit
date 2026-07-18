import type { SecurityFinding } from "../rule-based-scanner";

export type SecurityKnowledgeBaseCategory =
  | "authentication"
  | "authorization"
  | "csrf"
  | "express"
  | "helmet"
  | "cors"
  | "injection"
  | "jwt"
  | "logging"
  | "prisma"
  | "rate_limiting"
  | "react"
  | "secrets"
  | "sql_injection"
  | "validation"
  | "xss";

export type SecurityKnowledgeBaseSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type SecurityKnowledgeBaseCodeExample = {
  language: "typescript" | "tsx" | "javascript" | "prisma";
  vulnerable: string;
  secure: string;
};

export type SecurityKnowledgeBaseReference = {
  title: string;
  url: string;
};

export type SecurityKnowledgeBaseRule = {
  id: string;
  title: string;
  category: SecurityKnowledgeBaseCategory;
  severity: SecurityKnowledgeBaseSeverity;
  owasp: string;
  cwe: string | null;
  description: string;
  businessImpact: string;
  technicalImpact: string;
  remediationSteps: string[];
  secureCodingRecommendations: string[];
  codeExample: SecurityKnowledgeBaseCodeExample;
  externalReferences: SecurityKnowledgeBaseReference[];
  confidenceScore: number;
  tags: string[];
};

export type SecurityKnowledgeBaseRuleSummary = Pick<
  SecurityKnowledgeBaseRule,
  "id" | "title" | "category" | "severity" | "owasp" | "cwe" | "confidenceScore" | "tags"
>;

export type SecurityKnowledgeBaseRuleFilters = {
  category?: SecurityKnowledgeBaseCategory;
  severity?: SecurityKnowledgeBaseSeverity;
  owasp?: string;
  cwe?: string;
  tag?: string;
  search?: string;
};

export type EnrichedSecurityFinding = SecurityFinding & {
  knowledgeBase: SecurityKnowledgeBaseRule | null;
};

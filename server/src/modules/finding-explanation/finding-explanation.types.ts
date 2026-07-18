import type {
  SecurityKnowledgeBaseCodeExample,
  SecurityKnowledgeBaseReference,
  SecurityKnowledgeBaseSeverity,
} from "../security-knowledge-base";

export type ExplainableSecurityFinding = {
  ruleId?: string | null;
  severity: string;
  title: string;
  description: string;
  file: string;
  line: number;
  category?: string | null;
  owasp?: string | null;
  recommendation?: string | null;
  confidence?: string | null;
};

export type FindingExplanationRiskLevel = {
  severity: SecurityKnowledgeBaseSeverity;
  label: string;
  score: number;
};

export type FindingExplanation = {
  title: string;
  description: string;
  whyItMatters: string;
  businessImpact: string;
  technicalImpact: string;
  riskLevel: FindingExplanationRiskLevel;
  owasp: string | null;
  recommendation: string;
  codeExample: SecurityKnowledgeBaseCodeExample | null;
  references: SecurityKnowledgeBaseReference[];
  confidence: {
    label: string;
    score: number;
  };
};

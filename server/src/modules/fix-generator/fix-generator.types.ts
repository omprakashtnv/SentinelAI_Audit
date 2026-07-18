import type {
  SecurityKnowledgeBaseCategory,
  SecurityKnowledgeBaseCodeExample,
  SecurityKnowledgeBaseReference,
  SecurityKnowledgeBaseRule,
  SecurityKnowledgeBaseSeverity,
} from "../security-knowledge-base";
import type { SecurityFinding } from "../rule-based-scanner";

export type FixGeneratorFindingInput = Pick<
  SecurityFinding,
  "ruleId" | "title" | "description" | "file" | "line" | "category" | "owasp" | "recommendation" | "confidence"
>;

export type FixGeneratorInput = Partial<FixGeneratorFindingInput> & {
  ruleId: string;
};

export type FixGeneratorCodeExample = {
  language: SecurityKnowledgeBaseCodeExample["language"];
  code: string;
};

export type SecurityFix = {
  ruleId: string;
  title: string;
  category: SecurityKnowledgeBaseCategory;
  severity: SecurityKnowledgeBaseSeverity;
  owasp: string;
  cwe: string | null;
  explanation: string;
  secureImplementation: string;
  vulnerableExample: FixGeneratorCodeExample;
  secureExample: FixGeneratorCodeExample;
  remediationSteps: string[];
  secureCodingRecommendations: string[];
  references: SecurityKnowledgeBaseReference[];
  confidenceScore: number;
  findingLocation: {
    file: string | null;
    line: number | null;
  };
  generatedAt: string;
};

export type FixGeneratorRecipe = {
  explanation?: string;
  secureImplementation: string;
  remediationSteps?: string[];
  secureCodingRecommendations?: string[];
  codeExample?: Partial<SecurityKnowledgeBaseCodeExample>;
};

export type FixGeneratorRuleDescriptor = Pick<
  SecurityKnowledgeBaseRule,
  "id" | "title" | "category" | "severity" | "owasp" | "cwe" | "confidenceScore" | "tags"
>;

export interface FixGeneratorStrategy {
  readonly ruleId: string;
  readonly category: SecurityKnowledgeBaseCategory;
  supports(input: FixGeneratorInput): boolean;
  generate(input: FixGeneratorInput): SecurityFix;
}

export class UnsupportedFixGeneratorRuleError extends Error {
  public readonly code = "FIX_GENERATOR_RULE_NOT_SUPPORTED";

  public constructor(ruleId: string) {
    super(`Fix generator does not support rule: ${ruleId}`);
    this.name = "UnsupportedFixGeneratorRuleError";
  }
}

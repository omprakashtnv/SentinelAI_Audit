import type {
  SecurityCategory,
  SecurityConfidence,
  SecurityFinding,
  SecuritySeverity,
  SecuritySourceFile,
} from "./rule-based-scanner.types";

export type FindingTemplate = {
  ruleId: string;
  severity: SecuritySeverity;
  title: string;
  description: string;
  category: SecurityCategory;
  owasp: string;
  confidence: SecurityConfidence;
};

export function createFinding(
  template: FindingTemplate,
  file: SecuritySourceFile,
  line: number,
  overrides: Partial<Pick<SecurityFinding, "description" | "severity" | "title" | "confidence">> = {},
): SecurityFinding {
  return {
    ruleId: template.ruleId,
    severity: overrides.severity ?? template.severity,
    title: overrides.title ?? template.title,
    description: overrides.description ?? template.description,
    file: file.metadata.relativePath,
    line,
    category: template.category,
    owasp: template.owasp,
    confidence: overrides.confidence ?? template.confidence,
  };
}

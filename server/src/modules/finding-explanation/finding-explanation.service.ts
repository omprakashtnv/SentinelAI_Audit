import {
  securityKnowledgeBaseService,
  type SecurityKnowledgeBaseRule,
  type SecurityKnowledgeBaseSeverity,
} from "../security-knowledge-base";
import type {
  ExplainableSecurityFinding,
  FindingExplanation,
  FindingExplanationRiskLevel,
} from "./finding-explanation.types";

const SEVERITY_SCORES: Record<SecurityKnowledgeBaseSeverity, number> = {
  CRITICAL: 100,
  HIGH: 82,
  MEDIUM: 58,
  LOW: 32,
  INFO: 12,
};

const CONFIDENCE_SCORES: Record<string, number> = {
  HIGH: 0.9,
  MEDIUM: 0.65,
  LOW: 0.35,
};

export class FindingExplanationService {
  public constructor(
    private readonly knowledgeBase = securityKnowledgeBaseService,
  ) {}

  public explain(finding: ExplainableSecurityFinding): FindingExplanation {
    const knowledgeBaseRule = finding.ruleId ? this.knowledgeBase.getRule(finding.ruleId) : null;
    const severity = this.normalizeSeverity(finding.severity, knowledgeBaseRule);
    const confidence = this.resolveConfidence(finding, knowledgeBaseRule);

    return {
      title: knowledgeBaseRule?.title ?? finding.title,
      description: this.resolveDescription(finding, knowledgeBaseRule),
      whyItMatters: this.resolveWhyItMatters(finding, knowledgeBaseRule),
      businessImpact: knowledgeBaseRule?.businessImpact ?? this.createFallbackBusinessImpact(severity),
      technicalImpact: knowledgeBaseRule?.technicalImpact ?? this.createFallbackTechnicalImpact(finding),
      riskLevel: this.createRiskLevel(severity),
      owasp: knowledgeBaseRule?.owasp ?? finding.owasp ?? null,
      recommendation: this.resolveRecommendation(finding, knowledgeBaseRule),
      codeExample: knowledgeBaseRule?.codeExample ?? null,
      references: knowledgeBaseRule?.externalReferences ?? [],
      confidence,
    };
  }

  public explainMany(findings: ExplainableSecurityFinding[]): FindingExplanation[] {
    return findings.map((finding) => this.explain(finding));
  }

  private resolveDescription(
    finding: ExplainableSecurityFinding,
    knowledgeBaseRule: SecurityKnowledgeBaseRule | null,
  ): string {
    if (!knowledgeBaseRule) {
      return finding.description;
    }

    return `${finding.description} ${knowledgeBaseRule.description}`.trim();
  }

  private resolveWhyItMatters(
    finding: ExplainableSecurityFinding,
    knowledgeBaseRule: SecurityKnowledgeBaseRule | null,
  ): string {
    if (knowledgeBaseRule) {
      return [
        `SentinelAI mapped this finding to ${knowledgeBaseRule.owasp}`,
        knowledgeBaseRule.cwe ? `and ${knowledgeBaseRule.cwe}` : null,
        `because ${knowledgeBaseRule.description.toLowerCase()}`,
        `The affected location is ${finding.file}:${finding.line}.`,
      ]
        .filter((part): part is string => part !== null)
        .join(" ");
    }

    return `This finding matters because it identifies a ${finding.severity.toLowerCase()} risk at ${finding.file}:${finding.line} that may weaken the application's security posture.`;
  }

  private resolveRecommendation(
    finding: ExplainableSecurityFinding,
    knowledgeBaseRule: SecurityKnowledgeBaseRule | null,
  ): string {
    if (finding.recommendation) {
      return finding.recommendation;
    }

    if (knowledgeBaseRule) {
      return knowledgeBaseRule.remediationSteps.join(" ");
    }

    return "Review the affected code path, validate all assumptions, add a focused regression test, and apply the least invasive secure fix.";
  }

  private createRiskLevel(severity: SecurityKnowledgeBaseSeverity): FindingExplanationRiskLevel {
    return {
      severity,
      label: this.toTitleCase(severity),
      score: SEVERITY_SCORES[severity],
    };
  }

  private resolveConfidence(
    finding: ExplainableSecurityFinding,
    knowledgeBaseRule: SecurityKnowledgeBaseRule | null,
  ): FindingExplanation["confidence"] {
    const label = finding.confidence?.toUpperCase() ?? "MEDIUM";
    const score = knowledgeBaseRule?.confidenceScore ?? CONFIDENCE_SCORES[label] ?? 0.5;

    return {
      label: this.toTitleCase(label),
      score: Math.max(0, Math.min(1, Number(score.toFixed(2)))),
    };
  }

  private normalizeSeverity(
    severity: string,
    knowledgeBaseRule: SecurityKnowledgeBaseRule | null,
  ): SecurityKnowledgeBaseSeverity {
    const normalizedSeverity = severity.toUpperCase();

    if (this.isSecurityKnowledgeBaseSeverity(normalizedSeverity)) {
      return normalizedSeverity;
    }

    return knowledgeBaseRule?.severity ?? "INFO";
  }

  private isSecurityKnowledgeBaseSeverity(value: string): value is SecurityKnowledgeBaseSeverity {
    return ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].includes(value);
  }

  private createFallbackBusinessImpact(severity: SecurityKnowledgeBaseSeverity): string {
    if (severity === "CRITICAL" || severity === "HIGH") {
      return "This issue can create material security, compliance, and customer trust risk if exploitable in production.";
    }

    if (severity === "MEDIUM") {
      return "This issue can increase attack surface and should be remediated before the affected code is relied on for sensitive workflows.";
    }

    return "This issue is lower risk but can weaken defense-in-depth and should be addressed as part of normal hardening.";
  }

  private createFallbackTechnicalImpact(finding: ExplainableSecurityFinding): string {
    const category = finding.category ? `${finding.category} control` : "security control";

    return `The affected ${category} at ${finding.file}:${finding.line} may not enforce the expected protection consistently.`;
  }

  private toTitleCase(value: string): string {
    return value
      .toLowerCase()
      .split(/[_\s-]+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
}

export const findingExplanationService = new FindingExplanationService();

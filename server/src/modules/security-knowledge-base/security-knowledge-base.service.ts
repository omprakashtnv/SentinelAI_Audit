import { securityKnowledgeBaseRules } from "./security-knowledge-base.data";
import type {
  EnrichedSecurityFinding,
  SecurityKnowledgeBaseRule,
  SecurityKnowledgeBaseRuleFilters,
  SecurityKnowledgeBaseRuleSummary,
} from "./security-knowledge-base.types";
import type { SecurityFinding } from "../rule-based-scanner";

const MINIMUM_SUPPORTED_RULES = 50;

const REQUIRED_SCANNER_RULE_IDS = [
  "secret.jwt-secret",
  "secret.generic-api-key",
  "secret.aws-access-key",
  "secret.private-key",
  "logging.console-log",
  "injection.eval",
  "xss.dangerously-set-inner-html",
  "database.query-raw-unsafe",
  "database.query-raw",
  "process.exec",
  "process.spawn",
  "config.missing-helmet",
  "config.missing-rate-limiter",
  "validation.missing-input-validation",
  "config.weak-cors",
  "demo.hardcoded-secret",
  "demo.missing-input-validation",
  "demo.unsafe-database-query",
  "demo.weak-security-middleware",
] as const;

export class SecurityKnowledgeBaseService {
  private readonly rulesById: ReadonlyMap<string, SecurityKnowledgeBaseRule>;

  public constructor(private readonly rules: SecurityKnowledgeBaseRule[] = securityKnowledgeBaseRules) {
    this.validateRules(rules);
    this.rulesById = new Map(rules.map((rule) => [rule.id, rule]));
  }

  public listRules(filters: SecurityKnowledgeBaseRuleFilters = {}): SecurityKnowledgeBaseRuleSummary[] {
    return this.rules
      .filter((rule) => this.matchesFilters(rule, filters))
      .map((rule) => this.toRuleSummary(rule))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  public getRule(ruleId: string): SecurityKnowledgeBaseRule | null {
    return this.rulesById.get(ruleId) ?? null;
  }

  public requireRule(ruleId: string): SecurityKnowledgeBaseRule {
    const rule = this.getRule(ruleId);

    if (!rule) {
      throw new Error(`Security knowledge base rule not found: ${ruleId}`);
    }

    return rule;
  }

  public getRulesByIds(ruleIds: string[]): SecurityKnowledgeBaseRule[] {
    return [...new Set(ruleIds)]
      .map((ruleId) => this.getRule(ruleId))
      .filter((rule): rule is SecurityKnowledgeBaseRule => rule !== null);
  }

  public enrichFinding(finding: SecurityFinding): EnrichedSecurityFinding {
    return {
      ...finding,
      knowledgeBase: this.getRule(finding.ruleId),
    };
  }

  public enrichFindings(findings: SecurityFinding[]): EnrichedSecurityFinding[] {
    return findings.map((finding) => this.enrichFinding(finding));
  }

  public getReportContext(ruleIds: string[]): string {
    return this.getRulesByIds(ruleIds)
      .map((rule) =>
        [
          `Rule: ${rule.id}`,
          `Title: ${rule.title}`,
          `Severity: ${rule.severity}`,
          `Category: ${rule.category}`,
          `OWASP: ${rule.owasp}`,
          `CWE: ${rule.cwe ?? "N/A"}`,
          `Business Impact: ${rule.businessImpact}`,
          `Technical Impact: ${rule.technicalImpact}`,
          `Remediation: ${rule.remediationSteps.join(" ")}`,
        ].join("\n"),
      )
      .join("\n\n");
  }

  public getFixGeneratorContext(ruleId: string): string | null {
    const rule = this.getRule(ruleId);

    if (!rule) {
      return null;
    }

    return [
      `Fix guidance for ${rule.id}: ${rule.title}`,
      `Remediation steps:\n${rule.remediationSteps.map((step) => `- ${step}`).join("\n")}`,
      `Secure coding recommendations:\n${rule.secureCodingRecommendations.map((step) => `- ${step}`).join("\n")}`,
      "Vulnerable example:",
      rule.codeExample.vulnerable,
      "Secure example:",
      rule.codeExample.secure,
    ].join("\n");
  }

  public getAiPromptContext(ruleIds: string[]): string {
    return this.getRulesByIds(ruleIds)
      .map((rule) =>
        [
          `${rule.id} (${rule.severity}, confidence ${rule.confidenceScore})`,
          `Description: ${rule.description}`,
          `Expected remediation: ${rule.remediationSteps.join("; ")}`,
          `References: ${rule.externalReferences.map((reference) => reference.title).join(", ")}`,
        ].join("\n"),
      )
      .join("\n\n");
  }

  private matchesFilters(rule: SecurityKnowledgeBaseRule, filters: SecurityKnowledgeBaseRuleFilters): boolean {
    if (filters.category && rule.category !== filters.category) {
      return false;
    }

    if (filters.severity && rule.severity !== filters.severity) {
      return false;
    }

    if (filters.owasp && !rule.owasp.toLowerCase().includes(filters.owasp.toLowerCase())) {
      return false;
    }

    if (filters.cwe && rule.cwe?.toLowerCase() !== filters.cwe.toLowerCase()) {
      return false;
    }

    if (filters.tag && !rule.tags.includes(filters.tag)) {
      return false;
    }

    if (filters.search) {
      const haystack = [
        rule.id,
        rule.title,
        rule.category,
        rule.severity,
        rule.owasp,
        rule.cwe,
        rule.description,
        rule.tags.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(filters.search.toLowerCase());
    }

    return true;
  }

  private toRuleSummary(rule: SecurityKnowledgeBaseRule): SecurityKnowledgeBaseRuleSummary {
    return {
      id: rule.id,
      title: rule.title,
      category: rule.category,
      severity: rule.severity,
      owasp: rule.owasp,
      cwe: rule.cwe,
      confidenceScore: rule.confidenceScore,
      tags: rule.tags,
    };
  }

  private validateRules(rules: SecurityKnowledgeBaseRule[]): void {
    if (rules.length < MINIMUM_SUPPORTED_RULES) {
      throw new Error(`Security knowledge base must define at least ${MINIMUM_SUPPORTED_RULES} rules.`);
    }

    const ids = new Set<string>();

    for (const rule of rules) {
      if (ids.has(rule.id)) {
        throw new Error(`Duplicate security knowledge base rule id: ${rule.id}`);
      }

      ids.add(rule.id);

      if (rule.confidenceScore < 0 || rule.confidenceScore > 1) {
        throw new Error(`Invalid confidence score for rule ${rule.id}.`);
      }

      if (rule.remediationSteps.length === 0 || rule.secureCodingRecommendations.length === 0) {
        throw new Error(`Security knowledge base rule ${rule.id} is missing remediation guidance.`);
      }
    }

    for (const ruleId of REQUIRED_SCANNER_RULE_IDS) {
      if (!ids.has(ruleId)) {
        throw new Error(`Security knowledge base is missing scanner rule id: ${ruleId}`);
      }
    }
  }
}

export const securityKnowledgeBaseService = new SecurityKnowledgeBaseService();

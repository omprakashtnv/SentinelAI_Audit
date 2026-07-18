import {
  SecurityKnowledgeBaseService,
  securityKnowledgeBaseService,
  type SecurityKnowledgeBaseRule,
} from "../security-knowledge-base";
import type { SecurityFinding } from "../rule-based-scanner";
import { createFixGeneratorStrategies } from "./fix-generator.registry";
import type {
  FixGeneratorInput,
  FixGeneratorRuleDescriptor,
  FixGeneratorStrategy,
  SecurityFix,
} from "./fix-generator.types";
import { UnsupportedFixGeneratorRuleError } from "./fix-generator.types";

export class FixGeneratorService {
  private readonly strategiesByRuleId: ReadonlyMap<string, FixGeneratorStrategy>;

  public constructor(
    private readonly knowledgeBase: SecurityKnowledgeBaseService = securityKnowledgeBaseService,
    strategies?: FixGeneratorStrategy[],
  ) {
    const resolvedStrategies = strategies ?? createFixGeneratorStrategies(this.loadKnowledgeBaseRules());
    this.strategiesByRuleId = this.buildStrategyMap(resolvedStrategies);
  }

  public generateFix(input: FixGeneratorInput): SecurityFix {
    return this.getStrategy(input.ruleId).generate(input);
  }

  public generateFixForFinding(finding: SecurityFinding): SecurityFix {
    return this.generateFix(finding);
  }

  public generateFixes(inputs: FixGeneratorInput[]): SecurityFix[] {
    return inputs.map((input) => this.generateFix(input));
  }

  public generateFixesForFindings(findings: SecurityFinding[]): SecurityFix[] {
    return findings.map((finding) => this.generateFixForFinding(finding));
  }

  public supportsRule(ruleId: string): boolean {
    return this.strategiesByRuleId.has(ruleId);
  }

  public getSupportedRule(ruleId: string): FixGeneratorRuleDescriptor | null {
    if (!this.supportsRule(ruleId)) {
      return null;
    }

    const rule = this.knowledgeBase.getRule(ruleId);

    if (!rule) {
      return null;
    }

    return this.toRuleDescriptor(rule);
  }

  public listSupportedRules(): FixGeneratorRuleDescriptor[] {
    return this.knowledgeBase
      .listRules()
      .filter((rule) => this.supportsRule(rule.id))
      .map((rule) => {
        const fullRule = this.knowledgeBase.requireRule(rule.id);
        return this.toRuleDescriptor(fullRule);
      });
  }

  private getStrategy(ruleId: string): FixGeneratorStrategy {
    const strategy = this.strategiesByRuleId.get(ruleId);

    if (!strategy) {
      throw new UnsupportedFixGeneratorRuleError(ruleId);
    }

    return strategy;
  }

  private loadKnowledgeBaseRules(): SecurityKnowledgeBaseRule[] {
    return this.knowledgeBase.listRules().map((rule) => this.knowledgeBase.requireRule(rule.id));
  }

  private buildStrategyMap(strategies: FixGeneratorStrategy[]): ReadonlyMap<string, FixGeneratorStrategy> {
    const strategiesByRuleId = new Map<string, FixGeneratorStrategy>();

    for (const strategy of strategies) {
      if (strategiesByRuleId.has(strategy.ruleId)) {
        throw new Error(`Duplicate fix generator strategy for rule: ${strategy.ruleId}`);
      }

      strategiesByRuleId.set(strategy.ruleId, strategy);
    }

    return strategiesByRuleId;
  }

  private toRuleDescriptor(rule: SecurityKnowledgeBaseRule): FixGeneratorRuleDescriptor {
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
}

export const fixGeneratorService = new FixGeneratorService();

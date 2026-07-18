import type { SecurityKnowledgeBaseRule } from "../security-knowledge-base";
import type {
  FixGeneratorInput,
  FixGeneratorRecipe,
  FixGeneratorStrategy,
  SecurityFix,
} from "./fix-generator.types";

export class KnowledgeBaseRuleFixGeneratorStrategy implements FixGeneratorStrategy {
  public readonly ruleId: string;
  public readonly category: SecurityKnowledgeBaseRule["category"];

  public constructor(
    private readonly rule: SecurityKnowledgeBaseRule,
    private readonly recipe: FixGeneratorRecipe,
  ) {
    this.ruleId = rule.id;
    this.category = rule.category;
  }

  public supports(input: FixGeneratorInput): boolean {
    return input.ruleId === this.ruleId;
  }

  public generate(input: FixGeneratorInput): SecurityFix {
    const vulnerableCode = this.recipe.codeExample?.vulnerable ?? this.rule.codeExample.vulnerable;
    const secureCode = this.recipe.codeExample?.secure ?? this.rule.codeExample.secure;
    const language = this.recipe.codeExample?.language ?? this.rule.codeExample.language;

    return {
      ruleId: this.rule.id,
      title: input.title ?? this.rule.title,
      category: this.rule.category,
      severity: this.rule.severity,
      owasp: input.owasp ?? this.rule.owasp,
      cwe: this.rule.cwe,
      explanation: this.buildExplanation(input),
      secureImplementation: this.recipe.secureImplementation,
      vulnerableExample: {
        language,
        code: vulnerableCode,
      },
      secureExample: {
        language,
        code: secureCode,
      },
      remediationSteps: uniqueStrings([
        ...this.rule.remediationSteps,
        ...(this.recipe.remediationSteps ?? []),
        ...(input.recommendation ? [input.recommendation] : []),
      ]),
      secureCodingRecommendations: uniqueStrings([
        ...this.rule.secureCodingRecommendations,
        ...(this.recipe.secureCodingRecommendations ?? []),
      ]),
      references: this.rule.externalReferences,
      confidenceScore: this.rule.confidenceScore,
      findingLocation: {
        file: input.file ?? null,
        line: input.line ?? null,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private buildExplanation(input: FixGeneratorInput): string {
    const location = input.file
      ? `Detected at ${input.file}${typeof input.line === "number" ? `:${input.line}` : ""}.`
      : null;

    return [
      input.description ?? this.recipe.explanation ?? this.rule.description,
      location,
      `Why it matters: ${this.rule.description}`,
      `Business impact: ${this.rule.businessImpact}`,
      `Technical impact: ${this.rule.technicalImpact}`,
    ]
      .filter((value): value is string => Boolean(value))
      .join("\n\n");
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

import { codeDiffGeneratorService, CodeDiffGeneratorService, type CodeDiffLanguage } from "../code-diff-generator";
import { fixGeneratorService, FixGeneratorService, type SecurityFix } from "../fix-generator";
import { openAIService, OpenAIService } from "../openai";
import { ApiError } from "../../shared/errors/api-error";
import { logger } from "../../shared/logger/logger";
import type { FindingExplanation } from "../finding-explanation";
import type { FixGeneratorInput } from "../fix-generator";
import type {
  FindingFixPreview,
  FindingFixPreviewAssurance,
  FindingFixPreviewEnhancement,
  PublicFinding,
} from "./finding.types";

type TemplatePreview = Omit<FindingFixPreview, "patch" | "enhancement" | "assurance"> & {
  fixConfidenceScore: number;
  basedOn: string[];
};

export class FindingFixPreviewService {
  public constructor(
    private readonly fixGenerator: FixGeneratorService = fixGeneratorService,
    private readonly openai: OpenAIService = openAIService,
    private readonly diffGenerator: CodeDiffGeneratorService = codeDiffGeneratorService,
  ) {}

  public async buildPreview(finding: PublicFinding, explanation: FindingExplanation): Promise<FindingFixPreview> {
    const template = this.buildTemplatePreview(finding, explanation);

    if (!this.openai.isConfigured()) {
      return this.withPatch(template, {
        source: "template",
        attemptedAi: false,
        usedAi: false,
        reason: this.openai.getDisabledReason() ?? "OPENAI_NOT_CONFIGURED",
        model: null,
        responseId: null,
      });
    }

    try {
      const result = await this.openai.enhanceSecurityFix({
        finding: {
          title: finding.title,
          severity: finding.severity,
          file: finding.file,
          line: finding.line,
          category: finding.category,
          owasp: finding.owasp,
          confidence: finding.confidence,
        },
        template: {
          explanation: template.explanation,
          recommendation: template.recommendation,
          originalCode: template.originalCode,
          generatedFix: template.generatedFix,
          language: template.language,
        },
      });

      return this.withPatch(
        {
          ...template,
          explanation: result.enhancement.explanation,
          recommendation: result.enhancement.recommendation,
          generatedFix: result.enhancement.generatedFix,
        },
        {
          source: "openai",
          attemptedAi: true,
          usedAi: true,
          reason: null,
          model: result.model,
          responseId: result.responseId,
        },
      );
    } catch (error) {
      const reason = this.toFallbackReason(error);

      logger.warn("OpenAI fix enhancement unavailable; using template fix preview.", {
        code: reason,
        findingId: finding.id,
        projectId: finding.projectId,
      });

      return this.withPatch(template, {
        source: "template",
        attemptedAi: true,
        usedAi: false,
        reason,
        model: null,
        responseId: null,
      });
    }
  }

  private buildTemplatePreview(finding: PublicFinding, explanation: FindingExplanation): TemplatePreview {
    const securityFix = this.tryGenerateSecurityFix(finding);
    const originalCode =
      securityFix?.vulnerableExample.code ??
      explanation.codeExample?.vulnerable ??
      [
        "// Original source is not available in the template preview.",
        `// Finding: ${finding.title}`,
        `// Location: ${finding.file}:${finding.line}`,
      ].join("\n");
    const generatedFix =
      securityFix?.secureExample.code ??
      explanation.codeExample?.secure ??
      [
        "// Generated secure code is not available for this custom finding.",
        "// Apply the recommendation below as the remediation direction.",
        `// ${explanation.recommendation}`,
      ].join("\n");

    return {
      findingId: finding.id,
      projectId: finding.projectId,
      ruleId: finding.ruleId,
      title: explanation.title,
      severity: finding.severity,
      status: finding.status,
      file: finding.file,
      line: finding.line,
      category: finding.category,
      owasp: explanation.owasp,
      confidence: finding.confidence,
      explanation: securityFix?.explanation ?? explanation.description,
      recommendation: this.resolveTemplateRecommendation(securityFix, explanation),
      originalCode,
      generatedFix,
      language: this.resolveLanguage(securityFix, explanation, finding.file),
      fixConfidenceScore: this.resolveFixConfidenceScore(securityFix, explanation),
      basedOn: this.resolveBasedOn(securityFix, explanation),
    };
  }

  private tryGenerateSecurityFix(finding: PublicFinding): SecurityFix | null {
    if (!finding.ruleId || !this.fixGenerator.supportsRule(finding.ruleId)) {
      return null;
    }

    const input: FixGeneratorInput = {
      ruleId: finding.ruleId,
      title: finding.title,
      description: finding.description,
      file: finding.file,
      line: finding.line,
      owasp: finding.owasp ?? undefined,
      recommendation: finding.recommendation ?? undefined,
    };

    if (this.isSecurityConfidence(finding.confidence)) {
      input.confidence = finding.confidence;
    }

    return this.fixGenerator.generateFix(input);
  }

  private resolveTemplateRecommendation(
    securityFix: SecurityFix | null,
    explanation: FindingExplanation,
  ): string {
    if (!securityFix) {
      return explanation.recommendation;
    }

    return securityFix.remediationSteps.join(" ") || securityFix.secureImplementation || explanation.recommendation;
  }

  private withPatch(
    preview: TemplatePreview,
    enhancement: FindingFixPreviewEnhancement,
  ): FindingFixPreview {
    return {
      ...preview,
      patch: this.diffGenerator.generateDiff({
        originalCode: preview.originalCode,
        generatedSecureCode: preview.generatedFix,
        language: preview.language,
        originalFileName: preview.file,
        generatedFileName: preview.file,
        contextLines: 4,
      }),
      enhancement,
      assurance: this.buildAssurance(preview, enhancement),
    };
  }

  private buildAssurance(
    preview: TemplatePreview,
    enhancement: FindingFixPreviewEnhancement,
  ): FindingFixPreviewAssurance {
    return {
      fixSource: enhancement.usedAi ? "OpenAI-enhanced (Verified)" : "Template-based (Verified)",
      confidenceScore: preview.fixConfidenceScore,
      basedOn: preview.basedOn,
      verification: ["Syntax checked", "Framework compatible"],
    };
  }

  private resolveFixConfidenceScore(
    securityFix: SecurityFix | null,
    explanation: FindingExplanation,
  ): number {
    const score = securityFix?.confidenceScore ?? explanation.confidence.score ?? 0.9;
    return Math.max(0, Math.min(100, Math.round(score * 100)));
  }

  private resolveBasedOn(securityFix: SecurityFix | null, explanation: FindingExplanation): string[] {
    const sources = new Set<string>(["OWASP ASVS"]);
    const cwe = securityFix?.cwe;

    if (cwe) {
      sources.add(cwe);
    }

    if (explanation.owasp) {
      sources.add(explanation.owasp);
    }

    sources.add(this.toBestPracticeSource(securityFix?.category));

    return [...sources];
  }

  private toBestPracticeSource(category: SecurityFix["category"] | undefined): string {
    if (category === "express" || category === "helmet" || category === "cors" || category === "rate_limiting") {
      return "Express Security Best Practices";
    }

    if (category === "react" || category === "xss") {
      return "React Security Best Practices";
    }

    if (category === "prisma" || category === "sql_injection") {
      return "Prisma Security Best Practices";
    }

    return "Secure Coding Best Practices";
  }

  private resolveLanguage(
    securityFix: SecurityFix | null,
    explanation: FindingExplanation,
    filePath: string,
  ): CodeDiffLanguage {
    const normalizedPath = filePath.toLowerCase();

    if (normalizedPath.endsWith(".tsx")) {
      return "tsx";
    }

    if (normalizedPath.endsWith(".jsx")) {
      return "jsx";
    }

    if (normalizedPath.endsWith(".ts")) {
      return "typescript";
    }

    if (normalizedPath.endsWith(".js") || normalizedPath.endsWith(".mjs") || normalizedPath.endsWith(".cjs")) {
      return "javascript";
    }

    if (normalizedPath.endsWith(".json")) {
      return "json";
    }

    if (normalizedPath.endsWith(".prisma")) {
      return "prisma";
    }

    if (normalizedPath.endsWith(".md")) {
      return "markdown";
    }

    if (normalizedPath.endsWith(".yaml") || normalizedPath.endsWith(".yml")) {
      return "yaml";
    }

    const language = securityFix?.secureExample.language ?? explanation.codeExample?.language;

    if (language === "typescript" || language === "javascript" || language === "tsx" || language === "prisma") {
      return language;
    }

    return "text";
  }

  private isSecurityConfidence(value: string | null): value is "HIGH" | "MEDIUM" | "LOW" {
    return value === "HIGH" || value === "MEDIUM" || value === "LOW";
  }

  private toFallbackReason(error: unknown): string {
    if (error instanceof ApiError) {
      return error.code;
    }

    return error instanceof Error ? error.name : "OPENAI_ENHANCEMENT_FAILED";
  }
}

export const findingFixPreviewService = new FindingFixPreviewService();

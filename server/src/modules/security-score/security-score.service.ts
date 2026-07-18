import {
  DEFAULT_SECURITY_SCORE_MAXIMUM_SCORE,
  DEFAULT_SECURITY_SCORE_MINIMUM_SCORE,
  DEFAULT_SECURITY_SCORE_STARTING_SCORE,
  DEFAULT_SECURITY_SCORE_WEIGHTS,
} from "./security-score.constants";
import type {
  SecurityDomainScore,
  SecurityScoreBreakdown,
  SecurityScoreDomain,
  SecurityScoreEngineOptions,
  SecurityScoreFinding,
  SecurityScoreResult,
  SecurityScoreSeverity,
  SecurityScoreWeights,
} from "./security-score.types";

type ResolvedSecurityScoreOptions = Required<Omit<SecurityScoreEngineOptions, "weights">> & {
  weights: SecurityScoreWeights;
};

export class SecurityScoreEngineService {
  public calculateScore(
    findings: SecurityScoreFinding[],
    options: SecurityScoreEngineOptions = {},
  ): SecurityScoreResult {
    const resolvedOptions = this.resolveOptions(options);
    const activeFindings = findings.filter((finding) => this.shouldIncludeFinding(finding, resolvedOptions));
    const overall = this.calculateDomainScore(activeFindings, resolvedOptions);
    const authentication = this.calculateDomainScore(
      activeFindings.filter((finding) => this.matchesDomain(finding, "authentication")),
      resolvedOptions,
    );
    const authorization = this.calculateDomainScore(
      activeFindings.filter((finding) => this.matchesDomain(finding, "authorization")),
      resolvedOptions,
    );
    const database = this.calculateDomainScore(
      activeFindings.filter((finding) => this.matchesDomain(finding, "database")),
      resolvedOptions,
    );
    const frontend = this.calculateDomainScore(
      activeFindings.filter((finding) => this.matchesDomain(finding, "frontend")),
      resolvedOptions,
    );
    const api = this.calculateDomainScore(
      activeFindings.filter((finding) => this.matchesDomain(finding, "api")),
      resolvedOptions,
    );

    return {
      overallScore: overall.score,
      authenticationScore: authentication.score,
      authorizationScore: authorization.score,
      databaseScore: database.score,
      frontendScore: frontend.score,
      apiScore: api.score,
      domains: {
        authentication,
        authorization,
        database,
        frontend,
        api,
      },
      overall,
    };
  }

  private calculateDomainScore(
    findings: SecurityScoreFinding[],
    options: ResolvedSecurityScoreOptions,
  ): SecurityDomainScore {
    const breakdown = this.createBreakdown(findings, options.weights);
    const rawScore = options.startingScore - breakdown.totalDeductions;

    return {
      score: this.clamp(rawScore, options.minimumScore, options.maximumScore),
      findings: findings.length,
      breakdown,
    };
  }

  private createBreakdown(
    findings: SecurityScoreFinding[],
    weights: SecurityScoreWeights,
  ): SecurityScoreBreakdown {
    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const finding of findings) {
      const severity = this.normalizeSeverity(finding.severity);

      if (severity === "CRITICAL") {
        counts.critical += 1;
      } else if (severity === "HIGH") {
        counts.high += 1;
      } else if (severity === "MEDIUM") {
        counts.medium += 1;
      } else if (severity === "LOW") {
        counts.low += 1;
      } else {
        counts.info += 1;
      }
    }

    return {
      ...counts,
      totalDeductions:
        counts.critical * weights.CRITICAL +
        counts.high * weights.HIGH +
        counts.medium * weights.MEDIUM +
        counts.low * weights.LOW +
        counts.info * weights.INFO,
    };
  }

  private shouldIncludeFinding(
    finding: SecurityScoreFinding,
    options: ResolvedSecurityScoreOptions,
  ): boolean {
    const status = finding.status?.toUpperCase();

    if (finding.deletedAt) {
      return false;
    }

    if (!options.includeDismissed && status === "DISMISSED") {
      return false;
    }

    if (!options.includeResolved && status === "RESOLVED") {
      return false;
    }

    return true;
  }

  private matchesDomain(finding: SecurityScoreFinding, domain: Exclude<SecurityScoreDomain, "overall">): boolean {
    const haystack = [
      finding.title,
      finding.description,
      finding.file,
      finding.category,
      finding.owasp,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" ")
      .toLowerCase();

    if (domain === "authentication") {
      return this.matchesAny(haystack, ["auth", "login", "password", "jwt", "session", "token", "credential"]);
    }

    if (domain === "authorization") {
      return this.matchesAny(haystack, ["authorization", "permission", "role", "rbac", "access control", "ownership", "tenant"]);
    }

    if (domain === "database") {
      return this.matchesAny(haystack, ["database", "sql", "query", "prisma", "queryraw", "injection", "postgres", "mongodb"]);
    }

    if (domain === "frontend") {
      return this.matchesAny(haystack, ["frontend", "react", "tsx", "jsx", "xss", "dom", "dangerouslysetinnerhtml", "client/src"]);
    }

    return this.matchesAny(haystack, ["api", "route", "controller", "endpoint", "cors", "rate limit", "helmet", "validation", "middleware"]);
  }

  private matchesAny(value: string, candidates: string[]): boolean {
    return candidates.some((candidate) => value.includes(candidate));
  }

  private normalizeSeverity(severity: SecurityScoreSeverity): SecurityScoreSeverity {
    return severity.toUpperCase() as SecurityScoreSeverity;
  }

  private clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
  }

  private resolveOptions(options: SecurityScoreEngineOptions): ResolvedSecurityScoreOptions {
    return {
      weights: {
        ...DEFAULT_SECURITY_SCORE_WEIGHTS,
        ...options.weights,
      },
      startingScore: options.startingScore ?? DEFAULT_SECURITY_SCORE_STARTING_SCORE,
      minimumScore: options.minimumScore ?? DEFAULT_SECURITY_SCORE_MINIMUM_SCORE,
      maximumScore: options.maximumScore ?? DEFAULT_SECURITY_SCORE_MAXIMUM_SCORE,
      includeDismissed: options.includeDismissed ?? false,
      includeResolved: options.includeResolved ?? false,
    };
  }
}

export const securityScoreEngineService = new SecurityScoreEngineService();


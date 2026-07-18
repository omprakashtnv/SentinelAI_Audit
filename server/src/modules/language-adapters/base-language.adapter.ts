import type {
  LanguageAdapter,
  LanguageAdapterId,
  LanguageAdapterInput,
  LanguageAdapterOutput,
  LanguageAdapterRuntime,
} from "./language-adapter.types";

const CATEGORY_BEST_PRACTICES: Record<string, string[]> = {
  authentication: [
    "Keep credential verification in a dedicated service.",
    "Use bcrypt or an equivalent password hashing algorithm with reviewed cost settings.",
    "Return generic authentication failures to avoid account enumeration.",
  ],
  authorization: [
    "Enforce ownership and tenant constraints in repository queries.",
    "Treat route parameters and object ids as untrusted.",
    "Test cross-user access attempts for every protected resource.",
  ],
  csrf: [
    "Protect cookie-authenticated mutation routes with CSRF tokens.",
    "Set SameSite, Secure, and HttpOnly cookie attributes appropriately.",
    "Validate Origin or Referer headers for browser mutation endpoints.",
  ],
  cors: [
    "Use an explicit production origin allowlist.",
    "Never combine wildcard origins with credentialed requests.",
    "Keep CORS configuration in validated environment settings.",
  ],
  express: [
    "Register security middleware before routers.",
    "Use centralized async error handling.",
    "Set explicit body parser limits.",
  ],
  helmet: [
    "Install Helmet globally before application routes.",
    "Tune Content Security Policy per deployment environment.",
    "Keep HSTS enabled for production HTTPS.",
  ],
  injection: [
    "Replace dynamic execution with typed dispatch or allowlisted operations.",
    "Never interpolate untrusted values into shell commands.",
    "Add regression tests with metacharacter payloads.",
  ],
  jwt: [
    "Validate JWT issuer, audience, algorithm, expiration, and token type.",
    "Keep access tokens short-lived.",
    "Store refresh token hashes and rotate refresh tokens on use.",
  ],
  logging: [
    "Use structured logging with request ids.",
    "Redact credentials, tokens, cookies, and API responses.",
    "Remove debug logging from production paths.",
  ],
  prisma: [
    "Prefer Prisma model APIs over raw SQL.",
    "Use tagged parameterized raw queries only when necessary.",
    "Allowlist dynamic sort, table, or column identifiers.",
  ],
  rate_limiting: [
    "Apply route-aware rate limits before expensive handlers.",
    "Use stricter limits for authentication, upload, import, and scan endpoints.",
    "Return consistent 429 responses.",
  ],
  react: [
    "Render untrusted data as text through JSX.",
    "Keep dangerous HTML rendering isolated and sanitized.",
    "Do not expose private secrets through client environment variables.",
  ],
  secrets: [
    "Load secrets from validated server-side configuration or a secret manager.",
    "Rotate any secret that has been committed or logged.",
    "Block new secrets in pre-commit and CI checks.",
  ],
  sql_injection: [
    "Use ORM APIs or parameterized queries.",
    "Map dynamic identifiers through allowlists.",
    "Keep raw SQL isolated in repository methods.",
  ],
  validation: [
    "Validate request params, query, body, cookies, and files at runtime.",
    "Reject unknown fields where over-posting is dangerous.",
    "Pass parsed DTOs to services instead of raw request objects.",
  ],
  xss: [
    "Avoid HTML injection sinks.",
    "Sanitize rich HTML with an allowlist sanitizer when rendering HTML is required.",
    "Use Content Security Policy as defense in depth.",
  ],
};

export abstract class BaseLanguageAdapter implements LanguageAdapter {
  public abstract readonly id: LanguageAdapterId;
  public abstract readonly displayName: string;
  public abstract readonly runtime: LanguageAdapterRuntime;
  public abstract readonly supportedExtensions: readonly string[];

  public supports(input: LanguageAdapterInput): boolean {
    if (!input.filePath) {
      return true;
    }

    return this.supportedExtensions.some((extension) => input.filePath?.toLowerCase().endsWith(extension));
  }

  public generate(input: LanguageAdapterInput): LanguageAdapterOutput {
    return {
      adapter: this.id,
      displayName: this.displayName,
      runtime: this.runtime,
      secureCode: input.secureCode?.trim() || this.getSecureCode(input),
      bestPractices: this.mergeUnique(this.getCommonBestPractices(input), this.getBestPractices(input)),
      frameworkRecommendations: this.getFrameworkRecommendations(input),
      requiredDependencies: this.getRequiredDependencies(input),
      validationChecklist: this.getValidationChecklist(input),
    };
  }

  protected abstract getSecureCode(input: LanguageAdapterInput): string;

  protected abstract getBestPractices(input: LanguageAdapterInput): string[];

  protected abstract getFrameworkRecommendations(input: LanguageAdapterInput): string[];

  protected getRequiredDependencies(_input: LanguageAdapterInput): string[] {
    return [];
  }

  protected getValidationChecklist(input: LanguageAdapterInput): string[] {
    return [
      `Confirm the generated fix addresses ${input.ruleId ?? input.category ?? "the detected rule"}.`,
      "Add a regression test that fails against the vulnerable implementation.",
      "Run TypeScript, lint, and the relevant unit or integration test suite.",
      "Review logs and error responses to ensure no sensitive data is exposed.",
    ];
  }

  protected getCommonBestPractices(input: LanguageAdapterInput): string[] {
    if (!input.category) {
      return [];
    }

    return CATEGORY_BEST_PRACTICES[input.category] ?? [];
  }

  protected mergeUnique(...groups: string[][]): string[] {
    return [...new Set(groups.flat().map((value) => value.trim()).filter(Boolean))];
  }
}

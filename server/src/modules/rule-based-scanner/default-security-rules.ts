import type { SecurityFinding, SecurityRule, SecurityRuleContext, SecuritySourceFile } from "./rule-based-scanner.types";
import { createFinding, type FindingTemplate } from "./rule-factory";

type LineRule = FindingTemplate & {
  matcher: RegExp;
  excluded?: RegExp;
};

const LINE_RULES: LineRule[] = [
  {
    ruleId: "secret.jwt-secret",
    severity: "HIGH",
    title: "Hardcoded JWT secret",
    description: "A JWT secret appears to be hardcoded. Store signing secrets in environment variables or a secret manager.",
    category: "secrets",
    owasp: "A02:2021 - Cryptographic Failures",
    confidence: "HIGH",
    matcher: /\b(jwt[_-]?secret|jwt[_-]?access[_-]?secret|jwt[_-]?signing[_-]?secret)\b\s*[:=]\s*["'`][^"'`]{8,}["'`]/i,
    excluded: /process\.env|import\.meta\.env/i,
  },
  {
    ruleId: "secret.generic-api-key",
    severity: "HIGH",
    title: "Hardcoded API key or token",
    description: "A credential-like API key or token appears to be hardcoded. Move it to managed secrets.",
    category: "secrets",
    owasp: "A02:2021 - Cryptographic Failures",
    confidence: "MEDIUM",
    matcher: /\b([a-z0-9_]*(api[_-]?key|access[_-]?token|secret|client[_-]?secret)[a-z0-9_]*)\b\s*[:=]\s*["'`][A-Za-z0-9_./+=-]{12,}["'`]/i,
    excluded: /process\.env|import\.meta\.env|example|placeholder|replace-with/i,
  },
  {
    ruleId: "secret.aws-access-key",
    severity: "CRITICAL",
    title: "Hardcoded AWS access key",
    description: "An AWS access key pattern was detected in source code.",
    category: "secrets",
    owasp: "A02:2021 - Cryptographic Failures",
    confidence: "HIGH",
    matcher: /\b(AKIA|ASIA)[A-Z0-9]{16}\b/,
  },
  {
    ruleId: "secret.private-key",
    severity: "CRITICAL",
    title: "Private key material committed",
    description: "Private key material was found in the repository. Rotate the key and remove it from source control.",
    category: "secrets",
    owasp: "A02:2021 - Cryptographic Failures",
    confidence: "HIGH",
    matcher: /-----BEGIN (RSA |EC |OPENSSH |DSA |PRIVATE )?PRIVATE KEY-----/,
  },
  {
    ruleId: "logging.console-log",
    severity: "LOW",
    title: "console.log in production code",
    description: "console.log can leak sensitive data and create noisy production logs. Use the centralized logger instead.",
    category: "logging",
    owasp: "A09:2021 - Security Logging and Monitoring Failures",
    confidence: "MEDIUM",
    matcher: /\bconsole\.log\s*\(/,
    excluded: /\.test\.|\.spec\.|test\/|tests\/|__tests__\//i,
  },
  {
    ruleId: "injection.eval",
    severity: "CRITICAL",
    title: "Use of eval()",
    description: "eval() executes dynamic code and can lead to remote code execution.",
    category: "injection",
    owasp: "A03:2021 - Injection",
    confidence: "HIGH",
    matcher: /\beval\s*\(/,
  },
  {
    ruleId: "xss.dangerously-set-inner-html",
    severity: "HIGH",
    title: "dangerouslySetInnerHTML usage",
    description: "dangerouslySetInnerHTML can introduce XSS when content is not strictly sanitized.",
    category: "xss",
    owasp: "A03:2021 - Injection",
    confidence: "HIGH",
    matcher: /\bdangerouslySetInnerHTML\b/,
  },
  {
    ruleId: "database.query-raw-unsafe",
    severity: "CRITICAL",
    title: "Unsafe raw database query",
    description: "queryRawUnsafe can allow SQL injection when user-controlled input reaches the query.",
    category: "injection",
    owasp: "A03:2021 - Injection",
    confidence: "HIGH",
    matcher: /\b(queryRawUnsafe|\$queryRawUnsafe)\s*\(/,
  },
  {
    ruleId: "database.query-raw",
    severity: "MEDIUM",
    title: "Raw database query",
    description: "Raw SQL queries require careful parameterization and validation.",
    category: "injection",
    owasp: "A03:2021 - Injection",
    confidence: "MEDIUM",
    matcher: /\b(\$queryRaw|queryRaw)\s*(<[^>]+>)?\s*[\(`]/,
    excluded: /queryRawUnsafe/i,
  },
  {
    ruleId: "process.exec",
    severity: "HIGH",
    title: "Shell command execution",
    description: "exec() can introduce command injection when arguments include user-controlled input.",
    category: "unsafe_process_execution",
    owasp: "A03:2021 - Injection",
    confidence: "HIGH",
    matcher: /\bexec\s*\(/,
  },
  {
    ruleId: "process.spawn",
    severity: "MEDIUM",
    title: "Process spawn usage",
    description: "spawn() must validate executable names and arguments to avoid command execution risks.",
    category: "unsafe_process_execution",
    owasp: "A03:2021 - Injection",
    confidence: "MEDIUM",
    matcher: /\bspawn\s*\(/,
  },
];

export const sourcePatternRule: SecurityRule = {
  id: "source-pattern-rules",
  scan(context) {
    return context.files.flatMap((file) => scanLineRules(file));
  },
};

export const missingHelmetRule: SecurityRule = {
  id: "config.missing-helmet",
  scan(context) {
    if (!repositoryUsesExpress(context)) {
      return [];
    }

    if (repositoryContains(context, /\bhelmet\s*\(/) || repositoryContains(context, /from\s+["']helmet["']/)) {
      return [];
    }

    const file = getBestApplicationEntryFile(context);

    return file
      ? [
          createFinding(
            {
              ruleId: "config.missing-helmet",
              severity: "HIGH",
              title: "Missing Helmet middleware",
              description: "Express applications should use Helmet to set security-related HTTP headers.",
              category: "configuration",
              owasp: "A05:2021 - Security Misconfiguration",
              confidence: "MEDIUM",
            },
            file,
            1,
          ),
        ]
      : [];
  },
};

export const missingRateLimiterRule: SecurityRule = {
  id: "config.missing-rate-limiter",
  scan(context) {
    if (!repositoryUsesExpress(context)) {
      return [];
    }

    if (repositoryContains(context, /\brateLimit\s*\(/) || repositoryContains(context, /express-rate-limit/)) {
      return [];
    }

    const file = getBestApplicationEntryFile(context);

    return file
      ? [
          createFinding(
            {
              ruleId: "config.missing-rate-limiter",
              severity: "HIGH",
              title: "Missing rate limiter",
              description: "Public API routes should use rate limiting to reduce brute-force and abuse risk.",
              category: "configuration",
              owasp: "A04:2021 - Insecure Design",
              confidence: "MEDIUM",
            },
            file,
            1,
          ),
        ]
      : [];
  },
};

export const missingValidationRule: SecurityRule = {
  id: "validation.missing-input-validation",
  scan(context) {
    const routeOrControllerFiles = context.files.filter((file) =>
      /\.(route|routes|controller)\.(ts|tsx|js|jsx)$/i.test(file.metadata.relativePath),
    );

    return routeOrControllerFiles.flatMap((file) => {
      const hasMutationHandler = /\b(post|put|patch)\s*\(/i.test(file.content);
      const hasValidation = /\b(validateRequest|zodResolver|\.parse\s*\(|\.safeParse\s*\(|z\.)\b/i.test(file.content);

      if (!hasMutationHandler || hasValidation) {
        return [];
      }

      return [
        createFinding(
          {
            ruleId: "validation.missing-input-validation",
            severity: "MEDIUM",
            title: "Missing request validation",
            description: "Mutation routes should validate request params, body, and query before reaching business logic.",
            category: "validation",
            owasp: "A04:2021 - Insecure Design",
            confidence: "MEDIUM",
          },
          file,
          1,
        ),
      ];
    });
  },
};

export const weakCorsRule: SecurityRule = {
  id: "config.weak-cors",
  scan(context) {
    return context.files.flatMap((file) => {
      const findings: SecurityFinding[] = [];

      file.lines.forEach((line, index) => {
        if (/cors\s*\(\s*\)/.test(line) || /origin\s*:\s*["']\*["']/.test(line)) {
          findings.push(
            createFinding(
              {
                ruleId: "config.weak-cors",
                severity: "MEDIUM",
                title: "Weak CORS policy",
                description: "CORS appears to allow broad origins. Restrict origins to trusted application URLs.",
                category: "configuration",
                owasp: "A05:2021 - Security Misconfiguration",
                confidence: "MEDIUM",
              },
              file,
              index + 1,
            ),
          );
        }
      });

      return findings;
    });
  },
};

export const defaultSecurityRules: SecurityRule[] = [
  sourcePatternRule,
  missingHelmetRule,
  missingRateLimiterRule,
  missingValidationRule,
  weakCorsRule,
];

function scanLineRules(file: SecuritySourceFile): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  file.lines.forEach((line, index) => {
    if (isRuleMetadataLine(line)) {
      return;
    }

    for (const rule of LINE_RULES) {
      if (rule.excluded?.test(line) || rule.excluded?.test(file.metadata.relativePath)) {
        continue;
      }

      if (rule.matcher.test(line)) {
        findings.push(createFinding(rule, file, index + 1));
      }
    }
  });

  return findings;
}

function isRuleMetadataLine(line: string): boolean {
  return /^\s*(title|description|matcher|excluded)\s*:/.test(line);
}

function repositoryContains(context: SecurityRuleContext, pattern: RegExp): boolean {
  return context.files.some((file) => pattern.test(file.content));
}

function repositoryUsesExpress(context: SecurityRuleContext): boolean {
  return (
    repositoryContains(context, /from\s+["']express["']/) ||
    repositoryContains(context, /require\(["']express["']\)/) ||
    repositoryContains(context, /\bexpress\s*\(/)
  );
}

function getBestApplicationEntryFile(context: SecurityRuleContext): SecuritySourceFile | null {
  return (
    context.files.find((file) => /(^|\/)(app|server|main|index)\.(ts|js)$/i.test(file.metadata.relativePath)) ??
    context.files[0] ??
    null
  );
}

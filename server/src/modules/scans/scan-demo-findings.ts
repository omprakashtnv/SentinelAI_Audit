import type { RepositoryIndex } from "../file-indexer";
import type { SecurityFinding } from "../rule-based-scanner";

type DemoFindingTemplate = Omit<SecurityFinding, "file" | "line"> & {
  preferredExtensions: string[];
};

const DEMO_FINDING_TEMPLATES: DemoFindingTemplate[] = [
  {
    ruleId: "demo.hardcoded-secret",
    severity: "HIGH",
    title: "Demo: hardcoded application secret",
    description:
      "Demo mode finding showing how SentinelAI reports embedded credentials or signing secrets that should be moved into a managed secret store.",
    category: "secrets",
    owasp: "A02:2021 - Cryptographic Failures",
    recommendation: "Move secrets into environment variables or a secret manager and rotate any exposed values.",
    confidence: "HIGH",
    preferredExtensions: [".env", ".ts", ".js", ".tsx", ".jsx"],
  },
  {
    ruleId: "demo.missing-input-validation",
    severity: "MEDIUM",
    title: "Demo: missing request validation",
    description:
      "Demo mode finding showing how unvalidated user input can reach application logic without a schema boundary.",
    category: "validation",
    owasp: "A04:2021 - Insecure Design",
    recommendation: "Validate request bodies, params, and query strings with strict schemas before business logic runs.",
    confidence: "MEDIUM",
    preferredExtensions: [".ts", ".js"],
  },
  {
    ruleId: "demo.unsafe-database-query",
    severity: "HIGH",
    title: "Demo: unsafe database query pattern",
    description:
      "Demo mode finding showing how dynamically constructed database queries can become injection risks.",
    category: "injection",
    owasp: "A03:2021 - Injection",
    recommendation: "Use parameterized queries or ORM-safe query builders instead of interpolating untrusted input.",
    confidence: "MEDIUM",
    preferredExtensions: [".ts", ".js", ".prisma"],
  },
  {
    ruleId: "demo.weak-security-middleware",
    severity: "LOW",
    title: "Demo: missing layered API protection",
    description:
      "Demo mode finding showing how production APIs should use defense-in-depth controls such as Helmet, CORS allowlists, and rate limiting.",
    category: "configuration",
    owasp: "A05:2021 - Security Misconfiguration",
    recommendation: "Enable secure headers, narrow CORS origins, and apply rate limits to authentication and scan endpoints.",
    confidence: "LOW",
    preferredExtensions: [".ts", ".js"],
  },
];

export function createDemoSecurityFindings(repositoryIndex: RepositoryIndex): SecurityFinding[] {
  const fallbackFile = repositoryIndex.files[0];

  if (!fallbackFile) {
    return [];
  }

  return DEMO_FINDING_TEMPLATES.map((template) => {
    const file =
      repositoryIndex.files.find((candidate) => template.preferredExtensions.includes(candidate.extension)) ??
      fallbackFile;

    return {
      ruleId: template.ruleId,
      severity: template.severity,
      title: template.title,
      description: template.description,
      file: file.relativePath,
      line: Math.max(1, Math.min(file.lineCount, 12)),
      category: template.category,
      owasp: template.owasp,
      recommendation: template.recommendation,
      confidence: template.confidence,
    };
  });
}

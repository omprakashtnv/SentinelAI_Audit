import type { SecurityKnowledgeBaseCategory } from "../security-knowledge-base";
import type { FixGeneratorRecipe } from "./fix-generator.types";

export const CATEGORY_FIX_RECIPES: Record<SecurityKnowledgeBaseCategory, FixGeneratorRecipe> = {
  authentication: {
    secureImplementation: [
      "Centralize authentication behind a dedicated service that validates identity, verifies password hashes with bcrypt, and issues short-lived access tokens.",
      "Normalize account state checks such as disabled, locked, or unverified users before creating a session.",
      "Keep authentication routes isolated from business controllers and audit all successful and failed login events through the application logger.",
    ].join(" "),
    remediationSteps: [
      "Move credential verification into a dedicated authentication service.",
      "Use bcrypt with a production cost factor and compare hashes with constant-time library functions.",
      "Return generic authentication errors that do not reveal whether an email or username exists.",
      "Add tests for invalid credentials, disabled users, and successful session creation.",
    ],
    secureCodingRecommendations: [
      "Never store plaintext passwords or reversible password material.",
      "Keep session creation separate from user lookup and profile serialization.",
      "Use generic login failure messages and structured security logs.",
    ],
  },
  authorization: {
    secureImplementation: [
      "Enforce authorization in the service or repository boundary where the protected resource is loaded.",
      "Every query for tenant-owned data should include the authenticated user's ownership constraint, not just a route-level check.",
      "Return not found for inaccessible resources when exposing existence would leak tenant data.",
    ].join(" "),
    remediationSteps: [
      "Add owner or tenant predicates to every read, update, and delete query.",
      "Validate authorization before side effects occur.",
      "Add regression tests that prove one user cannot read or modify another user's resources.",
    ],
    secureCodingRecommendations: [
      "Treat object ids from the client as untrusted.",
      "Prefer repository methods such as findByIdForUser over generic findById helpers.",
      "Keep administrative bypasses explicit and separately tested.",
    ],
  },
  csrf: {
    secureImplementation: [
      "For cookie-authenticated state-changing requests, require a CSRF token or a signed double-submit cookie.",
      "Set session cookies with SameSite=Lax or Strict when possible, Secure in production, and HttpOnly for secrets.",
      "Reject unsafe methods that do not present a valid origin, referer, or CSRF token according to the application policy.",
    ].join(" "),
    remediationSteps: [
      "Add CSRF middleware to state-changing routes that rely on cookies.",
      "Set secure cookie attributes consistently for refresh tokens and sessions.",
      "Validate Origin or Referer headers for browser-facing mutation endpoints.",
    ],
    secureCodingRecommendations: [
      "Do not rely on CORS as CSRF protection.",
      "Do not expose CSRF tokens in persistent logs.",
      "Keep CSRF validation close to the route layer.",
    ],
  },
  express: {
    secureImplementation: [
      "Register security middleware before routes, keep request parsing limits explicit, and route all failures through centralized error handling.",
      "Avoid exposing stack traces, framework fingerprints, or unvalidated request data in responses.",
      "Keep infrastructure concerns such as logging, rate limiting, CORS, and headers in the app bootstrap layer.",
    ].join(" "),
    remediationSteps: [
      "Review Express middleware order and place security middleware before routers.",
      "Set JSON and URL-encoded body size limits.",
      "Use an async handler and centralized error middleware for every route.",
    ],
    secureCodingRecommendations: [
      "Disable x-powered-by.",
      "Keep controllers thin and move business logic into services.",
      "Avoid route-specific security exceptions unless documented and tested.",
    ],
  },
  helmet: {
    secureImplementation: [
      "Install Helmet globally during Express initialization and configure CSP, HSTS, frame, referrer, and content-type protections for the deployment model.",
      "Apply stricter policies in production while keeping development allowances explicit and local.",
    ].join(" "),
    remediationSteps: [
      "Register app.use(helmet(...)) before application routes.",
      "Define a Content Security Policy that allows only trusted origins.",
      "Enable HSTS for HTTPS production deployments.",
    ],
    secureCodingRecommendations: [
      "Do not disable Helmet globally to fix a single route.",
      "Keep CSP exceptions narrow and documented.",
      "Validate headers in integration tests.",
    ],
  },
  cors: {
    secureImplementation: [
      "Use an explicit origin allowlist from validated configuration and reject unknown origins.",
      "Only enable credentials when the client uses cookies and every allowed origin is trusted.",
      "Avoid wildcard origins in production APIs, especially when authorization headers or cookies are accepted.",
    ].join(" "),
    remediationSteps: [
      "Replace wildcard CORS with a parsed allowlist.",
      "Fail closed when the request origin is not present in the allowlist.",
      "Add separate development and production CORS configuration.",
    ],
    secureCodingRecommendations: [
      "Never combine Access-Control-Allow-Origin: * with credentials.",
      "Avoid reflecting arbitrary origins.",
      "Review CORS changes as security-sensitive configuration.",
    ],
  },
  injection: {
    secureImplementation: [
      "Remove dynamic code execution and command construction paths.",
      "Use typed APIs, allowlisted operations, and parameterized libraries instead of interpreting user-controlled strings.",
      "If a process must be launched, use fixed executable names, argument arrays, timeouts, and strict allowlists.",
    ].join(" "),
    remediationSteps: [
      "Identify every user-controlled value that reaches an interpreter, shell, template, or command boundary.",
      "Replace string execution with typed APIs or allowlisted commands.",
      "Add tests with metacharacters and payloads that previously reached the dangerous sink.",
    ],
    secureCodingRecommendations: [
      "Do not use eval, Function, or shell interpolation for request data.",
      "Prefer spawn or execFile with fixed command paths and argument arrays when process execution is unavoidable.",
      "Log rejected commands without including secrets.",
    ],
  },
  jwt: {
    secureImplementation: [
      "Validate JWT configuration at startup, use strong asymmetric or high-entropy symmetric secrets, and keep access tokens short-lived.",
      "Verify issuer, audience, expiration, algorithm, and token type for every protected request.",
      "Store refresh token hashes server-side and rotate refresh tokens on every use.",
    ].join(" "),
    remediationSteps: [
      "Move JWT secrets to validated environment configuration or a secret manager.",
      "Set explicit issuer, audience, expiresIn, and allowed algorithms.",
      "Add refresh token rotation and replay detection when persistent sessions are required.",
    ],
    secureCodingRecommendations: [
      "Never accept alg=none.",
      "Do not store long-lived access tokens in localStorage.",
      "Separate access token and refresh token secrets.",
    ],
  },
  logging: {
    secureImplementation: [
      "Replace console logging with a centralized structured logger that supports redaction, levels, request ids, and environment-specific transports.",
      "Sanitize sensitive fields before logging request bodies, headers, tokens, credentials, or provider responses.",
      "Keep production logs actionable without leaking secrets or personal data.",
    ].join(" "),
    remediationSteps: [
      "Route application logs through the shared logger.",
      "Add redaction for authorization headers, cookies, passwords, tokens, and API keys.",
      "Remove debug logs from production code paths or guard them behind configuration.",
    ],
    secureCodingRecommendations: [
      "Never log passwords, refresh tokens, private keys, or full authorization headers.",
      "Include request ids instead of raw request payloads.",
      "Use log levels consistently.",
    ],
  },
  prisma: {
    secureImplementation: [
      "Prefer Prisma model APIs and typed where clauses over raw SQL.",
      "When raw SQL is required, use tagged parameterized queries and keep interpolated identifiers out of user control.",
      "Validate and normalize filters before they reach repository methods.",
    ].join(" "),
    remediationSteps: [
      "Replace unsafe raw queries with Prisma model operations where possible.",
      "Use $queryRaw tagged templates only for parameterized raw queries.",
      "Reject or map user-controlled sort fields, table names, and column names through allowlists.",
    ],
    secureCodingRecommendations: [
      "Avoid $queryRawUnsafe in application code.",
      "Keep raw SQL in repository methods with tests.",
      "Use transactions for multi-step state changes.",
    ],
  },
  rate_limiting: {
    secureImplementation: [
      "Apply route-aware rate limiting before expensive handlers and authentication-sensitive endpoints.",
      "Use stricter limits for login, registration, password reset, upload, import, and scan actions.",
      "Key limits by user id when authenticated and by IP or trusted proxy identity before login.",
    ].join(" "),
    remediationSteps: [
      "Install a global baseline limiter and stricter endpoint-specific limiters.",
      "Configure trust proxy correctly before relying on IP addresses.",
      "Return consistent 429 responses with retry guidance.",
    ],
    secureCodingRecommendations: [
      "Do not use a single permissive limiter for every endpoint.",
      "Keep limit windows and thresholds in validated configuration.",
      "Monitor 429 rates for abuse and false positives.",
    ],
  },
  react: {
    secureImplementation: [
      "Use React's default escaping by rendering data as text, not HTML.",
      "Keep dangerous rendering paths behind small reviewed components that sanitize input and document the trusted source.",
      "Avoid storing secrets in browser-accessible state, localStorage, or bundled environment variables.",
    ].join(" "),
    remediationSteps: [
      "Replace unsafe DOM writes with normal JSX text rendering.",
      "Sanitize externally supplied HTML with a vetted sanitizer when HTML rendering is unavoidable.",
      "Move secrets and privileged operations to the backend.",
    ],
    secureCodingRecommendations: [
      "Treat all API and Markdown content as untrusted by default.",
      "Do not expose private environment variables through Vite client prefixes.",
      "Use typed API responses and validation for critical client data.",
    ],
  },
  secrets: {
    secureImplementation: [
      "Remove hardcoded secrets from source code and load them through validated environment variables or a managed secret store.",
      "Rotate any credential that has been committed, logged, shared, or exposed in client bundles.",
      "Add secret scanning to pre-commit and CI so new credentials are blocked before merge.",
    ].join(" "),
    remediationSteps: [
      "Revoke and rotate the exposed credential immediately.",
      "Move the secret to a secret manager or validated server-side environment variable.",
      "Purge the secret from logs and repository history according to incident response policy.",
      "Add automated secret scanning to developer and CI workflows.",
    ],
    secureCodingRecommendations: [
      "Never prefix private secrets with VITE_ or other client-exposed prefixes.",
      "Use separate credentials for development, staging, and production.",
      "Prefer short-lived provider credentials where supported.",
    ],
  },
  sql_injection: {
    secureImplementation: [
      "Use ORM model APIs or parameterized queries so untrusted input is bound as data rather than executable SQL.",
      "Map dynamic sort, table, and column choices through allowlists instead of concatenating request values.",
      "Keep SQL construction inside repositories and cover it with injection regression tests.",
    ].join(" "),
    remediationSteps: [
      "Replace string-concatenated SQL with Prisma model methods or tagged parameterized queries.",
      "Allowlist any dynamic identifiers.",
      "Add tests with quotes, comments, boolean payloads, and stacked query attempts.",
    ],
    secureCodingRecommendations: [
      "Do not concatenate request values into SQL strings.",
      "Treat search, sort, filter, and pagination parameters as untrusted.",
      "Prefer typed query builders over raw SQL.",
    ],
  },
  validation: {
    secureImplementation: [
      "Validate all untrusted inputs at the route boundary with Zod schemas and pass typed, parsed data to controllers and services.",
      "Reject unknown fields where over-posting could change privileged state.",
      "Keep schemas close to DTOs and reuse them for tests and API documentation.",
    ].join(" "),
    remediationSteps: [
      "Create request schemas for params, query, body, cookies, and files.",
      "Use centralized validation middleware before controllers.",
      "Add negative tests for malformed, missing, oversized, and unknown fields.",
    ],
    secureCodingRecommendations: [
      "Never trust TypeScript types as runtime validation.",
      "Prefer safeParse in middleware and return structured 400 responses.",
      "Normalize emails, URLs, and enum values before service logic.",
    ],
  },
  xss: {
    secureImplementation: [
      "Render untrusted values through safe text output and avoid HTML injection sinks.",
      "If rich HTML is required, sanitize with an allowlist-based sanitizer before rendering and keep the sanitizer policy centrally reviewed.",
      "Pair output encoding with a restrictive Content Security Policy.",
    ].join(" "),
    remediationSteps: [
      "Remove direct HTML injection sinks where normal rendering is sufficient.",
      "Sanitize trusted rich-content workflows with an allowlist-based sanitizer.",
      "Add XSS regression tests for script tags, event handlers, javascript URLs, and encoded payloads.",
    ],
    secureCodingRecommendations: [
      "Do not pass API content directly to dangerouslySetInnerHTML.",
      "Avoid building HTML strings from user data.",
      "Use CSP as defense in depth, not the primary fix.",
    ],
  },
};

export const RULE_FIX_RECIPES: Partial<Record<string, FixGeneratorRecipe>> = {
  "secret.jwt-secret": {
    secureImplementation:
      "Load JWT secrets from validated server-side configuration, require high entropy at startup, and rotate any committed value before redeploying.",
    codeExample: {
      vulnerable: "const JWT_SECRET = \"dev-secret\";\nconst token = jwt.sign(payload, JWT_SECRET);",
      secure:
        "const jwtSecret = config.auth.jwtAccessSecret;\nconst token = jwt.sign(payload, jwtSecret, {\n  issuer: config.auth.jwtIssuer,\n  audience: config.auth.jwtAudience,\n  expiresIn: \"15m\",\n});",
    },
  },
  "secret.generic-api-key": {
    secureImplementation:
      "Move API keys to a server-only secret store or validated environment variable, rotate exposed keys, and ensure client bundles never include private provider credentials.",
  },
  "secret.aws-access-key": {
    secureImplementation:
      "Revoke the exposed AWS access key, replace long-lived static credentials with IAM roles or short-lived STS credentials, and scope permissions with least privilege.",
  },
  "secret.private-key": {
    secureImplementation:
      "Remove private key material from the repository, rotate the corresponding certificate or key pair, and load private keys only from protected secret storage at runtime.",
  },
  "logging.console-log": {
    secureImplementation:
      "Replace console.log with the shared Winston logger and redact secrets, tokens, cookies, passwords, and API responses before writing production logs.",
    codeExample: {
      vulnerable: "console.log(\"login request\", req.body);",
      secure: "logger.info(\"login request received\", { requestId: req.id, userAgent: req.get(\"user-agent\") });",
    },
  },
  "injection.eval": {
    secureImplementation:
      "Remove eval and replace dynamic execution with a typed dispatch table, parser, or allowlisted operation map.",
    codeExample: {
      vulnerable: "const result = eval(req.body.expression);",
      secure:
        "const operations = { add: (left: number, right: number) => left + right };\nconst operation = operations[parsed.operation];\nconst result = operation(parsed.left, parsed.right);",
    },
  },
  "xss.dangerously-set-inner-html": {
    secureImplementation:
      "Render content as normal JSX text. If rich HTML is a product requirement, sanitize the HTML with a strict allowlist before passing it to a small reviewed component.",
    codeExample: {
      language: "tsx",
      vulnerable: "<div dangerouslySetInnerHTML={{ __html: userContent }} />",
      secure: "<p>{userContent}</p>",
    },
  },
  "database.query-raw-unsafe": {
    secureImplementation:
      "Replace $queryRawUnsafe with Prisma model APIs or tagged $queryRaw templates that bind user values as parameters.",
    codeExample: {
      vulnerable: "await prisma.$queryRawUnsafe(`SELECT * FROM User WHERE email = '${email}'`);",
      secure: "await prisma.user.findUnique({ where: { email } });",
    },
  },
  "database.query-raw": {
    secureImplementation:
      "Review raw SQL usage and convert to Prisma model APIs when possible. Keep required raw SQL parameterized with tagged templates and allowlist dynamic identifiers.",
    codeExample: {
      vulnerable: "await prisma.$queryRaw`SELECT * FROM ${tableName} WHERE id = ${id}`;",
      secure: "await prisma.$queryRaw`SELECT * FROM \"Project\" WHERE id = ${projectId}`;",
    },
  },
  "process.exec": {
    secureImplementation:
      "Remove shell execution. If a command must run, use execFile or spawn with a fixed executable, argument arrays, timeouts, and allowlisted inputs.",
    codeExample: {
      vulnerable: "exec(`git clone ${repoUrl}`);",
      secure: "spawn(\"git\", [\"clone\", validatedRepoUrl], { shell: false, timeout: 30_000 });",
    },
  },
  "process.spawn": {
    secureImplementation:
      "Keep the executable fixed, pass user input only as validated arguments, disable shell mode, and enforce timeouts and output limits.",
    codeExample: {
      vulnerable: "spawn(req.body.command, req.body.args, { shell: true });",
      secure: "spawn(\"git\", [\"ls-remote\", validatedRepoUrl], { shell: false, timeout: 15_000 });",
    },
  },
  "config.missing-helmet": {
    secureImplementation:
      "Register Helmet before routes during Express bootstrap and configure CSP, HSTS, referrer policy, and frame protections for production.",
    codeExample: {
      vulnerable: "const app = express();\napp.use(apiRouter);",
      secure:
        "const app = express();\napp.disable(\"x-powered-by\");\napp.use(helmet({ contentSecurityPolicy: false }));\napp.use(apiRouter);",
    },
  },
  "config.missing-rate-limiter": {
    secureImplementation:
      "Add a global baseline rate limiter and stricter limiters for authentication, uploads, imports, and scan-triggering endpoints.",
    codeExample: {
      vulnerable: "app.use(\"/api\", apiRouter);",
      secure:
        "const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true });\napp.use(\"/api\", apiLimiter, apiRouter);",
    },
  },
  "validation.missing-input-validation": {
    secureImplementation:
      "Validate params, query, body, cookies, and uploaded file metadata with Zod before controller logic executes.",
    codeExample: {
      vulnerable: "const projectName = req.body.name;\nawait projectService.create(projectName);",
      secure:
        "const createProjectSchema = z.object({ name: z.string().min(1).max(120) });\nconst { name } = createProjectSchema.parse(req.body);\nawait projectService.create(name);",
    },
  },
  "config.weak-cors": {
    secureImplementation:
      "Replace wildcard or reflected CORS origins with a strict allowlist from validated configuration and enable credentials only for trusted origins.",
    codeExample: {
      vulnerable: "app.use(cors({ origin: \"*\", credentials: true }));",
      secure:
        "app.use(cors({\n  origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),\n  credentials: true,\n}));",
    },
  },
};

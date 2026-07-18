import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info"),
  REQUEST_BODY_LIMIT: z.string().default("1mb"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(30 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(500),
  SHUTDOWN_GRACE_MS: z.coerce.number().int().positive().default(10_000),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters."),
  JWT_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  REFRESH_TOKEN_COOKIE_NAME: z.string().min(1).default("sentinelai_refresh_token"),
  REFRESH_TOKEN_COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).optional(),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  UPLOAD_TEMP_DIR: z.string().min(1).default("tmp/uploads/zips"),
  UPLOAD_EXTRACT_DIR: z.string().min(1).default("tmp/uploads/extracted"),
  UPLOAD_MAX_ZIP_SIZE_BYTES: z.coerce.number().int().positive().default(100 * 1024 * 1024),
  UPLOAD_MAX_EXTRACTED_SIZE_BYTES: z.coerce.number().int().positive().default(500 * 1024 * 1024),
  UPLOAD_MAX_ZIP_ENTRIES: z.coerce.number().int().positive().default(10_000),
  GITHUB_IMPORT_BASE_DIR: z.string().min(1).default("tmp/imports/github"),
  GITHUB_IMPORT_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  REPOSITORY_PARSER_MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(1024 * 1024),
  REPOSITORY_PARSER_MAX_FILES: z.coerce.number().int().positive().default(20_000),
  REPOSITORY_PARSER_MAX_DEPTH: z.coerce.number().int().positive().default(50),
  OPENAI_API_KEY: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
    z.string().min(1).optional(),
  ),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1"),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  OPENAI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  OPENAI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
  OPENAI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(4_000),
  OPENAI_STREAMING_ENABLED: z.coerce.boolean().default(false),
  SENTINEL_DEMO_MODE: z.coerce.boolean().default(false),
  SENTINEL_DEMO_FINDINGS_ENABLED: z.coerce.boolean().default(false),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const details = parsedEnvironment.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  throw new Error(`Invalid environment configuration: ${JSON.stringify(details)}`);
}

const env = parsedEnvironment.data;
const refreshTokenCookieSameSite = env.REFRESH_TOKEN_COOKIE_SAME_SITE ?? (env.NODE_ENV === "production" ? "none" : "lax");
const configuredCorsOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
const developmentCorsOrigins =
  env.NODE_ENV === "development"
    ? configuredCorsOrigins.flatMap((origin) => {
        if (origin.startsWith("http://localhost:")) {
          return [origin, origin.replace("http://localhost:", "http://127.0.0.1:")];
        }

        if (origin.startsWith("http://127.0.0.1:")) {
          return [origin, origin.replace("http://127.0.0.1:", "http://localhost:")];
        }

        return [origin];
      })
    : configuredCorsOrigins;

export const environment = {
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === "development",
  isTest: env.NODE_ENV === "test",
  isProduction: env.NODE_ENV === "production",
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  corsOrigins: [...new Set(developmentCorsOrigins)],
  logLevel: env.LOG_LEVEL,
  requestBodyLimit: env.REQUEST_BODY_LIMIT,
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },
  shutdownGraceMs: env.SHUTDOWN_GRACE_MS,
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    accessTokenTtlSeconds: env.JWT_ACCESS_TOKEN_TTL_SECONDS,
  },
  refreshToken: {
    ttlDays: env.REFRESH_TOKEN_TTL_DAYS,
    ttlMs: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    cookieName: env.REFRESH_TOKEN_COOKIE_NAME,
    cookieSameSite: refreshTokenCookieSameSite,
    cookieSecure: env.NODE_ENV === "production" || refreshTokenCookieSameSite === "none",
  },
  security: {
    bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,
  },
  upload: {
    tempDir: env.UPLOAD_TEMP_DIR,
    extractDir: env.UPLOAD_EXTRACT_DIR,
    maxZipSizeBytes: env.UPLOAD_MAX_ZIP_SIZE_BYTES,
    maxExtractedSizeBytes: env.UPLOAD_MAX_EXTRACTED_SIZE_BYTES,
    maxZipEntries: env.UPLOAD_MAX_ZIP_ENTRIES,
  },
  githubImport: {
    baseDir: env.GITHUB_IMPORT_BASE_DIR,
    timeoutMs: env.GITHUB_IMPORT_TIMEOUT_MS,
  },
  repositoryParser: {
    maxFileSizeBytes: env.REPOSITORY_PARSER_MAX_FILE_SIZE_BYTES,
    maxFiles: env.REPOSITORY_PARSER_MAX_FILES,
    maxDepth: env.REPOSITORY_PARSER_MAX_DEPTH,
  },
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    timeoutMs: env.OPENAI_TIMEOUT_MS,
    maxRetries: env.OPENAI_MAX_RETRIES,
    temperature: env.OPENAI_TEMPERATURE,
    maxOutputTokens: env.OPENAI_MAX_OUTPUT_TOKENS,
    streamingEnabled: env.OPENAI_STREAMING_ENABLED,
  },
  demo: {
    enabled: env.SENTINEL_DEMO_MODE,
    findingsEnabled: env.SENTINEL_DEMO_FINDINGS_ENABLED,
  },
} as const;

export type Environment = typeof environment;

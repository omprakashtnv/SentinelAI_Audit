export const DEFAULT_MAX_CHUNK_TOKENS = 4_000;
export const TOKEN_ESTIMATE_BYTES_PER_TOKEN = 4;
export const FILE_METADATA_TOKEN_OVERHEAD = 24;

export const CHUNK_ROLE_PRIORITY_ORDER = [
  "controller",
  "service",
  "repository",
  "middleware",
  "validator",
  "schema",
  "route",
  "model",
  "config",
  "test",
  "documentation",
  "other",
] as const;

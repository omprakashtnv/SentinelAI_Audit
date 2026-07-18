import path from "node:path";

import type { RepositoryLanguage } from "./repository-parser.types";

const EXTENSION_LANGUAGE_MAP = new Map<string, RepositoryLanguage>([
  [".cjs", "javascript"],
  [".cts", "typescript"],
  [".js", "javascript"],
  [".json", "json"],
  [".jsx", "javascript"],
  [".md", "markdown"],
  [".mjs", "javascript"],
  [".mts", "typescript"],
  [".prisma", "prisma"],
  [".ts", "typescript"],
  [".tsx", "typescript"],
  [".yaml", "yaml"],
  [".yml", "yaml"],
]);

export function detectLanguage(filePath: string): RepositoryLanguage | null {
  return EXTENSION_LANGUAGE_MAP.get(path.extname(filePath).toLowerCase()) ?? null;
}

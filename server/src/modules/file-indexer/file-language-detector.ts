import path from "node:path";

import type { IndexedFileLanguage } from "./file-indexer.types";

const INDEXED_FILE_LANGUAGE_BY_EXTENSION = new Map<string, IndexedFileLanguage>([
  [".js", "javascript"],
  [".json", "json"],
  [".jsx", "javascript"],
  [".md", "markdown"],
  [".prisma", "prisma"],
  [".ts", "typescript"],
  [".tsx", "typescript"],
  [".yaml", "yaml"],
  [".yml", "yaml"],
]);

export function detectIndexedFileLanguage(filePath: string): IndexedFileLanguage | null {
  return INDEXED_FILE_LANGUAGE_BY_EXTENSION.get(path.extname(filePath).toLowerCase()) ?? null;
}

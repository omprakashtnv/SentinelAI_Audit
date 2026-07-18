export type IndexedFileLanguage =
  | "javascript"
  | "json"
  | "markdown"
  | "prisma"
  | "typescript"
  | "yaml";

export type IndexedRepositoryFile = {
  relativePath: string;
  absolutePath: string;
  language: IndexedFileLanguage;
  extension: string;
  sizeBytes: number;
  sha256: string;
  lineCount: number;
  lastModifiedAt: string;
};

export type FileIndexerSkippedEntry = {
  relativePath: string;
  reason: "ignored_directory" | "unsupported_extension" | "symlink" | "unreadable";
};

export type RepositoryIndexSummary = {
  totalFilesDiscovered: number;
  indexedFiles: number;
  skippedEntries: number;
  totalIndexedBytes: number;
};

export type RepositoryIndex = {
  rootPath: string;
  indexedAt: string;
  files: IndexedRepositoryFile[];
  skippedEntries: FileIndexerSkippedEntry[];
  summary: RepositoryIndexSummary;
};

export type RepositoryLanguage =
  | "javascript"
  | "json"
  | "markdown"
  | "prisma"
  | "typescript"
  | "yaml";

export type RepositoryFileMetadata = {
  relativePath: string;
  extension: string;
  language: RepositoryLanguage;
  sizeBytes: number;
  sha256: string;
};

export type RepositoryParsedFile = {
  absolutePath: string;
  metadata: RepositoryFileMetadata;
};

export type RepositoryTreeFileNode = {
  type: "file";
  name: string;
  relativePath: string;
  metadata: RepositoryFileMetadata;
};

export type RepositoryTreeDirectoryNode = {
  type: "directory";
  name: string;
  relativePath: string;
  children: RepositoryTreeNode[];
};

export type RepositoryTreeNode = RepositoryTreeDirectoryNode | RepositoryTreeFileNode;

export type RepositoryParserSkippedFile = {
  relativePath: string;
  reason: "unsupported_extension" | "file_too_large" | "symlink" | "unreadable" | "max_files_exceeded";
};

export type RepositoryParseSummary = {
  totalFilesDiscovered: number;
  parsedFiles: number;
  skippedFiles: number;
  totalParsedBytes: number;
};

export type RepositoryParseResult = {
  rootPath: string;
  tree: RepositoryTreeDirectoryNode;
  files: RepositoryFileMetadata[];
  skippedFiles: RepositoryParserSkippedFile[];
  summary: RepositoryParseSummary;
};

export type ParseRepositoryOptions = {
  maxFileSizeBytes?: number;
  maxFiles?: number;
  maxDepth?: number;
};

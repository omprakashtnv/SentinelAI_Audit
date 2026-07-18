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

export type RepositoryParseSummary = {
  totalFilesDiscovered: number;
  parsedFiles: number;
  skippedFiles: number;
  totalParsedBytes: number;
};

export type RepositoryExplorer = {
  rootPath: string;
  tree: RepositoryTreeDirectoryNode;
  files: RepositoryFileMetadata[];
  summary: RepositoryParseSummary;
};

export type RepositorySource = {
  sourceType: "github" | "zip";
  displayName: string;
  repositoryUrl: string | null;
  defaultBranch: string | null;
  commitSha: string | null;
  originalFilename: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

export type RepositoryFileContent = RepositoryFileMetadata & {
  content: string;
};

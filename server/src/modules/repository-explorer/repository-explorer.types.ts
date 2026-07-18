import type { RepositoryFileMetadata, RepositoryParseSummary, RepositoryTreeDirectoryNode } from "../repository-parser";

export type PublicRepositoryExplorer = {
  rootPath: string;
  tree: RepositoryTreeDirectoryNode;
  files: RepositoryFileMetadata[];
  summary: RepositoryParseSummary;
};

export type PublicRepositorySource = {
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

export type RepositorySource = {
  displayName: string;
  sourceType: "github" | "zip";
  rootPath: string;
  repositoryUrl: string | null;
  defaultBranch: string | null;
  commitSha: string | null;
  originalFilename: string | null;
  sizeBytes: number | null;
  createdAt: Date;
};

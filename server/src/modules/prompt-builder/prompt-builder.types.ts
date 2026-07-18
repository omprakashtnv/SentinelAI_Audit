import type { RepositoryChunk, RepositoryChunkPlan } from "../chunk-generator";
import type { IndexedRepositoryFile, RepositoryIndex } from "../file-indexer";
import type { SecurityFinding } from "../rule-based-scanner";

export type PromptProjectContext = {
  projectId?: string;
  name: string;
  description?: string;
  repositoryUrl?: string;
  repositorySource?: "github" | "zip" | "local" | "unknown";
  defaultBranch?: string;
  techStack?: string[];
};

export type PromptFileContent = {
  relativePath: string;
  content: string;
};

export type PromptBuilderOptions = {
  maxRepositoryTreeEntries?: number;
  maxFileMetadataEntries?: number;
  maxFileContentChars?: number;
  maxChunkPlanEntries?: number;
  includeAbsolutePaths?: boolean;
};

export type BasePromptInput = {
  project: PromptProjectContext;
  repositoryIndex: RepositoryIndex;
  chunkPlan?: RepositoryChunkPlan;
  files?: PromptFileContent[];
  options?: PromptBuilderOptions;
};

export type SecurityScanPromptInput = BasePromptInput & {
  chunk?: RepositoryChunk;
  scanFocus?: string[];
};

export type PatchGenerationPromptInput = BasePromptInput & {
  findings: SecurityFinding[];
  constraints?: string[];
};

export type ReportGenerationPromptInput = Omit<BasePromptInput, "files"> & {
  findings: SecurityFinding[];
  audience?: "engineering" | "executive" | "compliance";
};

export type CodeExplanationPromptInput = BasePromptInput & {
  targetFile: PromptFileContent;
  targetFileMetadata?: IndexedRepositoryFile;
  question?: string;
};

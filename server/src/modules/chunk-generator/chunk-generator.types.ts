import type { IndexedFileLanguage, IndexedRepositoryFile, RepositoryIndex } from "../file-indexer";
import type { CHUNK_ROLE_PRIORITY_ORDER } from "./chunk-generator.constants";

export type ChunkRole = (typeof CHUNK_ROLE_PRIORITY_ORDER)[number];

export type ChunkPriority = "critical" | "high" | "medium" | "low";

export type ChunkedRepositoryFile = IndexedRepositoryFile & {
  role: ChunkRole;
  estimatedTokenCount: number;
  part?: {
    index: number;
    total: number;
  };
};

export type RepositoryChunk = {
  chunkId: string;
  files: ChunkedRepositoryFile[];
  estimatedTokenCount: number;
  language: IndexedFileLanguage | "mixed";
  priority: ChunkPriority;
};

export type ChunkGeneratorOptions = {
  maxTokens?: number;
};

export type ChunkGeneratorSummary = {
  totalFiles: number;
  totalChunks: number;
  maxTokens: number;
  estimatedTokenCount: number;
  oversizedFiles: number;
};

export type RepositoryChunkPlan = {
  repositoryRoot: string;
  generatedAt: string;
  chunks: RepositoryChunk[];
  summary: ChunkGeneratorSummary;
};

export type GenerateChunksInput = {
  repositoryIndex: RepositoryIndex;
  options?: ChunkGeneratorOptions;
};

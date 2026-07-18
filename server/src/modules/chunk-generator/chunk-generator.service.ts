import path from "node:path";

import type { IndexedFileLanguage, IndexedRepositoryFile } from "../file-indexer";
import {
  CHUNK_ROLE_PRIORITY_ORDER,
  DEFAULT_MAX_CHUNK_TOKENS,
  FILE_METADATA_TOKEN_OVERHEAD,
  TOKEN_ESTIMATE_BYTES_PER_TOKEN,
} from "./chunk-generator.constants";
import type {
  ChunkGeneratorOptions,
  ChunkPriority,
  ChunkRole,
  ChunkedRepositoryFile,
  GenerateChunksInput,
  RepositoryChunk,
  RepositoryChunkPlan,
} from "./chunk-generator.types";

type RoleBucket = {
  role: ChunkRole;
  files: ChunkedRepositoryFile[];
};

export class ChunkGeneratorService {
  public generateChunks(input: GenerateChunksInput): RepositoryChunkPlan {
    const maxTokens = this.resolveMaxTokens(input.options);
    const files = input.repositoryIndex.files
      .map((file) => this.toChunkedFile(file))
      .sort((left, right) => this.compareFiles(left, right));
    const buckets = this.groupFilesByRole(files);
    const chunks = buckets.flatMap((bucket) => this.createChunksForBucket(bucket, maxTokens));

    return {
      repositoryRoot: input.repositoryIndex.rootPath,
      generatedAt: new Date().toISOString(),
      chunks,
      summary: {
        totalFiles: input.repositoryIndex.files.length,
        totalChunks: chunks.length,
        maxTokens,
        estimatedTokenCount: chunks.reduce((total, chunk) => total + chunk.estimatedTokenCount, 0),
        oversizedFiles: files.filter((file) => file.estimatedTokenCount > maxTokens).length,
      },
    };
  }

  private resolveMaxTokens(options: ChunkGeneratorOptions | undefined): number {
    return Math.max(1, options?.maxTokens ?? DEFAULT_MAX_CHUNK_TOKENS);
  }

  private toChunkedFile(file: IndexedRepositoryFile): ChunkedRepositoryFile {
    return {
      ...file,
      role: this.detectRole(file.relativePath),
      estimatedTokenCount: this.estimateFileTokens(file),
    };
  }

  private estimateFileTokens(file: IndexedRepositoryFile): number {
    const byteBasedTokens = Math.ceil(file.sizeBytes / TOKEN_ESTIMATE_BYTES_PER_TOKEN);
    const lineBasedTokens = Math.ceil(file.lineCount * 1.4);

    return Math.max(1, byteBasedTokens, lineBasedTokens) + FILE_METADATA_TOKEN_OVERHEAD;
  }

  private groupFilesByRole(files: ChunkedRepositoryFile[]): RoleBucket[] {
    return CHUNK_ROLE_PRIORITY_ORDER.map((role) => ({
      role,
      files: files.filter((file) => file.role === role),
    })).filter((bucket) => bucket.files.length > 0);
  }

  private createChunksForBucket(bucket: RoleBucket, maxTokens: number): RepositoryChunk[] {
    const chunks: RepositoryChunk[] = [];
    let currentFiles: ChunkedRepositoryFile[] = [];
    let currentTokenCount = 0;

    for (const file of bucket.files) {
      if (file.estimatedTokenCount > maxTokens) {
        if (currentFiles.length > 0) {
          chunks.push(this.createChunk(bucket.role, currentFiles, chunks.length + 1));
          currentFiles = [];
          currentTokenCount = 0;
        }

        chunks.push(...this.splitOversizedFile(bucket.role, file, maxTokens, chunks.length + 1));
        continue;
      }

      if (currentFiles.length > 0 && currentTokenCount + file.estimatedTokenCount > maxTokens) {
        chunks.push(this.createChunk(bucket.role, currentFiles, chunks.length + 1));
        currentFiles = [];
        currentTokenCount = 0;
      }

      currentFiles.push(file);
      currentTokenCount += file.estimatedTokenCount;
    }

    if (currentFiles.length > 0) {
      chunks.push(this.createChunk(bucket.role, currentFiles, chunks.length + 1));
    }

    return chunks;
  }

  private splitOversizedFile(
    role: ChunkRole,
    file: ChunkedRepositoryFile,
    maxTokens: number,
    startingSequence: number,
  ): RepositoryChunk[] {
    const totalParts = Math.ceil(file.estimatedTokenCount / maxTokens);
    const chunks: RepositoryChunk[] = [];

    for (let partIndex = 1; partIndex <= totalParts; partIndex += 1) {
      const remainingTokens = file.estimatedTokenCount - maxTokens * (partIndex - 1);
      const estimatedTokenCount = Math.min(maxTokens, remainingTokens);
      const partFile: ChunkedRepositoryFile = {
        ...file,
        estimatedTokenCount,
        part: {
          index: partIndex,
          total: totalParts,
        },
      };

      chunks.push(this.createChunk(role, [partFile], startingSequence + chunks.length));
    }

    return chunks;
  }

  private createChunk(role: ChunkRole, files: ChunkedRepositoryFile[], sequence: number): RepositoryChunk {
    const estimatedTokenCount = files.reduce((total, file) => total + file.estimatedTokenCount, 0);

    return {
      chunkId: this.createChunkId(role, sequence),
      files,
      estimatedTokenCount,
      language: this.detectChunkLanguage(files),
      priority: this.getPriority(role),
    };
  }

  private createChunkId(role: ChunkRole, sequence: number): string {
    return `chunk_${role}_${String(sequence).padStart(4, "0")}`;
  }

  private detectChunkLanguage(files: ChunkedRepositoryFile[]): IndexedFileLanguage | "mixed" {
    const languages = new Set(files.map((file) => file.language));

    if (languages.size === 1) {
      const [language] = languages;
      return language ?? "mixed";
    }

    return "mixed";
  }

  private detectRole(relativePath: string): ChunkRole {
    const normalizedPath = relativePath.toLowerCase();
    const basename = path.basename(normalizedPath);

    if (this.matchesAny(normalizedPath, basename, ["controller", ".controller"])) {
      return "controller";
    }

    if (this.matchesAny(normalizedPath, basename, ["service", ".service"])) {
      return "service";
    }

    if (this.matchesAny(normalizedPath, basename, ["repository", ".repository", "repo"])) {
      return "repository";
    }

    if (this.matchesAny(normalizedPath, basename, ["middleware", ".middleware"])) {
      return "middleware";
    }

    if (this.matchesAny(normalizedPath, basename, ["validator", "validation", ".validator"])) {
      return "validator";
    }

    if (this.matchesAny(normalizedPath, basename, ["schema", ".schema"])) {
      return "schema";
    }

    if (this.matchesAny(normalizedPath, basename, ["route", ".routes", ".route"])) {
      return "route";
    }

    if (this.matchesAny(normalizedPath, basename, ["model", ".model", "prisma"])) {
      return "model";
    }

    if (this.matchesAny(normalizedPath, basename, ["config", ".config"])) {
      return "config";
    }

    if (this.matchesAny(normalizedPath, basename, ["test", ".spec", ".test", "__tests__"])) {
      return "test";
    }

    if (basename.endsWith(".md")) {
      return "documentation";
    }

    return "other";
  }

  private matchesAny(normalizedPath: string, basename: string, candidates: string[]): boolean {
    return candidates.some((candidate) => basename.includes(candidate) || normalizedPath.includes(`/${candidate}/`));
  }

  private getPriority(role: ChunkRole): ChunkPriority {
    if (role === "controller" || role === "service" || role === "repository") {
      return "critical";
    }

    if (role === "middleware" || role === "validator" || role === "schema" || role === "route") {
      return "high";
    }

    if (role === "model" || role === "config") {
      return "medium";
    }

    return "low";
  }

  private compareFiles(left: ChunkedRepositoryFile, right: ChunkedRepositoryFile): number {
    const roleComparison = this.getRoleOrder(left.role) - this.getRoleOrder(right.role);

    if (roleComparison !== 0) {
      return roleComparison;
    }

    return left.relativePath.localeCompare(right.relativePath);
  }

  private getRoleOrder(role: ChunkRole): number {
    return CHUNK_ROLE_PRIORITY_ORDER.indexOf(role);
  }
}

export const chunkGeneratorService = new ChunkGeneratorService();

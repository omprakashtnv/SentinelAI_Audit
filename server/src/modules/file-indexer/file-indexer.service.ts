import { createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import { ApiError } from "../../shared/errors/api-error";
import {
  FILE_INDEXER_IGNORED_DIRECTORY_NAMES,
  FILE_INDEXER_SUPPORTED_EXTENSIONS,
} from "./file-indexer.constants";
import { detectIndexedFileLanguage } from "./file-language-detector";
import type {
  FileIndexerSkippedEntry,
  IndexedRepositoryFile,
  RepositoryIndex,
} from "./file-indexer.types";

type IndexerState = {
  files: IndexedRepositoryFile[];
  skippedEntries: FileIndexerSkippedEntry[];
  totalFilesDiscovered: number;
  totalIndexedBytes: number;
};

type StreamedFileMetrics = {
  sha256: string;
  lineCount: number;
};

export class FileIndexerService {
  public async indexRepository(repositoryPath: string): Promise<RepositoryIndex> {
    const rootPath = await this.resolveRepositoryRoot(repositoryPath);
    const state: IndexerState = {
      files: [],
      skippedEntries: [],
      totalFilesDiscovered: 0,
      totalIndexedBytes: 0,
    };

    await this.scanDirectory(rootPath, rootPath, state);

    return {
      rootPath,
      indexedAt: new Date().toISOString(),
      files: state.files,
      skippedEntries: state.skippedEntries,
      summary: {
        totalFilesDiscovered: state.totalFilesDiscovered,
        indexedFiles: state.files.length,
        skippedEntries: state.skippedEntries.length,
        totalIndexedBytes: state.totalIndexedBytes,
      },
    };
  }

  private async resolveRepositoryRoot(repositoryPath: string): Promise<string> {
    const rootPath = path.resolve(repositoryPath);
    const stat = await this.safeLstat(rootPath);

    if (stat?.isSymbolicLink()) {
      throw new ApiError({
        statusCode: 400,
        code: "INVALID_REPOSITORY_PATH",
        message: "Repository path must not be a symbolic link.",
      });
    }

    if (!stat?.isDirectory()) {
      throw new ApiError({
        statusCode: 400,
        code: "INVALID_REPOSITORY_PATH",
        message: "Repository path must point to an existing directory.",
      });
    }

    return rootPath;
  }

  private async scanDirectory(rootPath: string, directoryPath: string, state: IndexerState): Promise<void> {
    const entries = await this.readDirectoryEntries(directoryPath);

    for (const entry of entries) {
      const absoluteEntryPath = path.join(directoryPath, entry.name);
      const relativeEntryPath = this.toRelativePath(rootPath, absoluteEntryPath);

      if (entry.isSymbolicLink()) {
        state.skippedEntries.push({ relativePath: relativeEntryPath, reason: "symlink" });
        continue;
      }

      if (entry.isDirectory()) {
        if (FILE_INDEXER_IGNORED_DIRECTORY_NAMES.has(entry.name.toLowerCase())) {
          state.skippedEntries.push({ relativePath: relativeEntryPath, reason: "ignored_directory" });
          continue;
        }

        await this.scanDirectory(rootPath, absoluteEntryPath, state);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      state.totalFilesDiscovered += 1;
      const indexedFile = await this.indexFile(rootPath, absoluteEntryPath, relativeEntryPath, state);

      if (indexedFile) {
        state.files.push(indexedFile);
        state.totalIndexedBytes += indexedFile.sizeBytes;
      }
    }
  }

  private async indexFile(
    rootPath: string,
    absolutePath: string,
    relativePath: string,
    state: IndexerState,
  ): Promise<IndexedRepositoryFile | null> {
    const extension = path.extname(absolutePath).toLowerCase();
    const language = detectIndexedFileLanguage(absolutePath);

    if (!FILE_INDEXER_SUPPORTED_EXTENSIONS.has(extension) || !language) {
      state.skippedEntries.push({ relativePath, reason: "unsupported_extension" });
      return null;
    }

    const stat = await this.safeLstat(absolutePath);

    if (stat?.isSymbolicLink()) {
      state.skippedEntries.push({ relativePath, reason: "symlink" });
      return null;
    }

    if (!stat?.isFile() || !this.isPathInsideRoot(rootPath, absolutePath)) {
      state.skippedEntries.push({ relativePath, reason: "unreadable" });
      return null;
    }

    const streamedMetrics = await this.safeCalculateStreamedFileMetrics(absolutePath);

    if (!streamedMetrics) {
      state.skippedEntries.push({ relativePath, reason: "unreadable" });
      return null;
    }

    return {
      relativePath,
      absolutePath,
      language,
      extension,
      sizeBytes: stat.size,
      sha256: streamedMetrics.sha256,
      lineCount: streamedMetrics.lineCount,
      lastModifiedAt: stat.mtime.toISOString(),
    };
  }

  private async readDirectoryEntries(directoryPath: string): Promise<fs.Dirent[]> {
    try {
      const entries = await fsp.readdir(directoryPath, { withFileTypes: true });

      return entries.sort((left, right) => left.name.localeCompare(right.name));
    } catch {
      return [];
    }
  }

  private async safeLstat(targetPath: string): Promise<fs.Stats | null> {
    try {
      return await fsp.lstat(targetPath);
    } catch {
      return null;
    }
  }

  private calculateStreamedFileMetrics(filePath: string): Promise<StreamedFileMetrics> {
    return new Promise((resolve, reject) => {
      const hash = createHash("sha256");
      const stream = fs.createReadStream(filePath);
      let lineCount = 0;
      let hasBytes = false;
      let lastByte: number | null = null;

      stream.on("error", reject);
      stream.on("data", (chunk) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        hasBytes = true;
        hash.update(buffer);

        for (const byte of buffer) {
          if (byte === 0x0a) {
            lineCount += 1;
          }

          lastByte = byte;
        }
      });
      stream.on("end", () => {
        if (hasBytes && lastByte !== 0x0a) {
          lineCount += 1;
        }

        resolve({
          sha256: hash.digest("hex"),
          lineCount,
        });
      });
    });
  }

  private async safeCalculateStreamedFileMetrics(filePath: string): Promise<StreamedFileMetrics | null> {
    try {
      return await this.calculateStreamedFileMetrics(filePath);
    } catch {
      return null;
    }
  }

  private isPathInsideRoot(rootPath: string, targetPath: string): boolean {
    const relativePath = path.relative(rootPath, targetPath);

    return Boolean(relativePath) && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
  }

  private toRelativePath(rootPath: string, targetPath: string): string {
    return path.relative(rootPath, targetPath).split(path.sep).join("/");
  }
}

export const fileIndexerService = new FileIndexerService();

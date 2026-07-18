import { createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import { environment } from "../../config/environment";
import { ApiError } from "../../shared/errors/api-error";
import { IGNORED_DIRECTORY_NAMES, SUPPORTED_FILE_EXTENSIONS } from "./repository-parser.constants";
import { detectLanguage } from "./language-detector";
import type {
  ParseRepositoryOptions,
  RepositoryFileMetadata,
  RepositoryParsedFile,
  RepositoryParseResult,
  RepositoryParserSkippedFile,
  RepositoryTreeDirectoryNode,
  RepositoryTreeNode,
} from "./repository-parser.types";

type EffectiveParserOptions = {
  maxFileSizeBytes: number;
  maxFiles: number;
  maxDepth: number;
};

type ParserState = {
  files: RepositoryFileMetadata[];
  skippedFiles: RepositoryParserSkippedFile[];
  totalFilesDiscovered: number;
  totalParsedBytes: number;
};

export class RepositoryParserService {
  public async parseRepository(
    repositoryPath: string,
    options: ParseRepositoryOptions = {},
  ): Promise<RepositoryParseResult> {
    const rootPath = await this.resolveRepositoryRoot(repositoryPath);
    const parserOptions = this.resolveOptions(options);
    const state: ParserState = {
      files: [],
      skippedFiles: [],
      totalFilesDiscovered: 0,
      totalParsedBytes: 0,
    };

    const tree = await this.scanDirectory({
      absolutePath: rootPath,
      rootPath,
      relativePath: "",
      depth: 0,
      options: parserOptions,
      state,
    });

    return {
      rootPath,
      tree,
      files: state.files,
      skippedFiles: state.skippedFiles,
      summary: {
        totalFilesDiscovered: state.totalFilesDiscovered,
        parsedFiles: state.files.length,
        skippedFiles: state.skippedFiles.length,
        totalParsedBytes: state.totalParsedBytes,
      },
    };
  }

  public async parseFile(
    repositoryPath: string,
    relativePath: string,
    options: ParseRepositoryOptions = {},
  ): Promise<RepositoryParsedFile> {
    const rootPath = await this.resolveRepositoryRoot(repositoryPath);
    const resolvedFile = this.resolveSafeFilePath(rootPath, relativePath);
    const metadata = await this.parseFileMetadata(
      resolvedFile.absolutePath,
      resolvedFile.relativePath,
      this.resolveOptions(options),
    );

    return {
      absolutePath: resolvedFile.absolutePath,
      metadata,
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

  private resolveOptions(options: ParseRepositoryOptions): EffectiveParserOptions {
    return {
      maxFileSizeBytes: options.maxFileSizeBytes ?? environment.repositoryParser.maxFileSizeBytes,
      maxFiles: options.maxFiles ?? environment.repositoryParser.maxFiles,
      maxDepth: options.maxDepth ?? environment.repositoryParser.maxDepth,
    };
  }

  private async scanDirectory(input: {
    absolutePath: string;
    rootPath: string;
    relativePath: string;
    depth: number;
    options: EffectiveParserOptions;
    state: ParserState;
  }): Promise<RepositoryTreeDirectoryNode> {
    if (input.depth > input.options.maxDepth) {
      return this.createDirectoryNode(input.absolutePath, input.relativePath, []);
    }

    const entries = await this.readDirectoryEntries(input.absolutePath);
    const children: RepositoryTreeNode[] = [];

    for (const entry of entries) {
      const absoluteEntryPath = path.join(input.absolutePath, entry.name);
      const relativeEntryPath = this.toRelativePath(input.rootPath, absoluteEntryPath);

      if (entry.isSymbolicLink()) {
        input.state.skippedFiles.push({ relativePath: relativeEntryPath, reason: "symlink" });
        continue;
      }

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORY_NAMES.has(entry.name.toLowerCase())) {
          continue;
        }

        children.push(
          await this.scanDirectory({
            absolutePath: absoluteEntryPath,
            rootPath: input.rootPath,
            relativePath: relativeEntryPath,
            depth: input.depth + 1,
            options: input.options,
            state: input.state,
          }),
        );
        continue;
      }

      if (entry.isFile()) {
        input.state.totalFilesDiscovered += 1;
        const fileNode = await this.scanFile({
          absolutePath: absoluteEntryPath,
          relativePath: relativeEntryPath,
          options: input.options,
          state: input.state,
        });

        if (fileNode) {
          children.push(fileNode);
        }
      }
    }

    return this.createDirectoryNode(input.absolutePath, input.relativePath, children);
  }

  private async readDirectoryEntries(directoryPath: string): Promise<fs.Dirent[]> {
    try {
      const entries = await fsp.readdir(directoryPath, { withFileTypes: true });

      return entries.sort((left, right) => left.name.localeCompare(right.name));
    } catch {
      return [];
    }
  }

  private async scanFile(input: {
    absolutePath: string;
    relativePath: string;
    options: EffectiveParserOptions;
    state: ParserState;
  }): Promise<RepositoryTreeNode | null> {
    if (input.state.files.length >= input.options.maxFiles) {
      input.state.skippedFiles.push({ relativePath: input.relativePath, reason: "max_files_exceeded" });
      return null;
    }

    let metadata: RepositoryFileMetadata;

    try {
      metadata = await this.parseFileMetadata(input.absolutePath, input.relativePath, input.options);
    } catch (error) {
      input.state.skippedFiles.push({
        relativePath: input.relativePath,
        reason: this.toSkippedFileReason(error),
      });
      return null;
    }

    input.state.files.push(metadata);
    input.state.totalParsedBytes += metadata.sizeBytes;

    return {
      type: "file",
      name: path.basename(input.absolutePath),
      relativePath: input.relativePath,
      metadata,
    };
  }

  private async parseFileMetadata(
    absolutePath: string,
    relativePath: string,
    options: EffectiveParserOptions,
  ): Promise<RepositoryFileMetadata> {
    const extension = path.extname(absolutePath).toLowerCase();
    const language = detectLanguage(absolutePath);

    if (!SUPPORTED_FILE_EXTENSIONS.has(extension) || !language) {
      throw new ApiError({
        statusCode: 415,
        code: "UNSUPPORTED_REPOSITORY_FILE",
        message: "File type is not supported by the repository parser.",
      });
    }

    const stat = await this.safeLstat(absolutePath);

    if (stat?.isSymbolicLink()) {
      throw new ApiError({
        statusCode: 400,
        code: "SYMLINK_REPOSITORY_FILE",
        message: "Repository file must not be a symbolic link.",
      });
    }

    if (!stat?.isFile()) {
      throw new ApiError({
        statusCode: 404,
        code: "REPOSITORY_FILE_NOT_FOUND",
        message: "Repository file was not found.",
      });
    }

    if (stat.size > options.maxFileSizeBytes) {
      throw new ApiError({
        statusCode: 413,
        code: "REPOSITORY_FILE_TOO_LARGE",
        message: "Repository file exceeds the parser size limit.",
      });
    }

    const sha256 = await this.safeCalculateSha256(absolutePath);

    if (!sha256) {
      throw new ApiError({
        statusCode: 400,
        code: "UNREADABLE_REPOSITORY_FILE",
        message: "Repository file could not be read.",
      });
    }

    return {
      relativePath,
      extension,
      language,
      sizeBytes: stat.size,
      sha256,
    };
  }

  private resolveSafeFilePath(
    rootPath: string,
    relativePath: string,
  ): {
    absolutePath: string;
    relativePath: string;
  } {
    const normalizedInput = relativePath.trim().replace(/\\/g, "/");
    const segments = normalizedInput.split("/").filter(Boolean);

    if (
      !normalizedInput ||
      path.isAbsolute(normalizedInput) ||
      segments.length === 0 ||
      segments.some((segment) => segment === "..")
    ) {
      throw new ApiError({
        statusCode: 400,
        code: "INVALID_REPOSITORY_FILE_PATH",
        message: "Repository file path is invalid.",
      });
    }

    const absolutePath = path.resolve(rootPath, ...segments);
    const relativeFromRoot = path.relative(rootPath, absolutePath);

    if (relativeFromRoot.startsWith("..") || path.isAbsolute(relativeFromRoot)) {
      throw new ApiError({
        statusCode: 400,
        code: "INVALID_REPOSITORY_FILE_PATH",
        message: "Repository file path is invalid.",
      });
    }

    return {
      absolutePath,
      relativePath: relativeFromRoot.split(path.sep).join("/"),
    };
  }

  private toSkippedFileReason(error: unknown): RepositoryParserSkippedFile["reason"] {
    if (!(error instanceof ApiError)) {
      return "unreadable";
    }

    if (error.code === "UNSUPPORTED_REPOSITORY_FILE") {
      return "unsupported_extension";
    }

    if (error.code === "REPOSITORY_FILE_TOO_LARGE") {
      return "file_too_large";
    }

    if (error.code === "SYMLINK_REPOSITORY_FILE") {
      return "symlink";
    }

    return "unreadable";
  }

  private async safeLstat(targetPath: string): Promise<fs.Stats | null> {
    try {
      return await fsp.lstat(targetPath);
    } catch {
      return null;
    }
  }

  private calculateSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash("sha256");
      const stream = fs.createReadStream(filePath);

      stream.on("error", reject);
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
    });
  }

  private async safeCalculateSha256(filePath: string): Promise<string | null> {
    try {
      return await this.calculateSha256(filePath);
    } catch {
      return null;
    }
  }

  private createDirectoryNode(
    absolutePath: string,
    relativePath: string,
    children: RepositoryTreeNode[],
  ): RepositoryTreeDirectoryNode {
    return {
      type: "directory",
      name: relativePath ? path.basename(absolutePath) : path.basename(absolutePath) || absolutePath,
      relativePath,
      children,
    };
  }

  private toRelativePath(rootPath: string, targetPath: string): string {
    return path.relative(rootPath, targetPath).split(path.sep).join("/");
  }
}

export const repositoryParserService = new RepositoryParserService();

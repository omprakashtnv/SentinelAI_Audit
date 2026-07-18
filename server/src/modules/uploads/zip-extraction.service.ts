import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import yauzl, { type Entry, type ZipFile } from "yauzl";

import { ApiError } from "../../shared/errors/api-error";
import { NESTED_ARCHIVE_EXTENSIONS } from "./upload.constants";

export type ZipExtractionOptions = {
  maxEntries: number;
  maxExtractedSizeBytes: number;
};

export type ZipExtractionResult = {
  extractionPath: string;
  fileCount: number;
  totalUncompressedBytes: number;
};

export class ZipExtractionService {
  public async extract(zipPath: string, destinationDirectory: string, options: ZipExtractionOptions): Promise<ZipExtractionResult> {
    const resolvedDestination = path.resolve(destinationDirectory);

    await fsp.rm(resolvedDestination, { force: true, recursive: true });
    await fsp.mkdir(resolvedDestination, { recursive: true });

    let fileCount = 0;
    let totalUncompressedBytes = 0;

    try {
      const zipFile = await this.openZip(zipPath);

      try {
        zipFile.setMaxListeners(0);

        for await (const entry of this.entries(zipFile)) {
          this.validateEntry(entry, resolvedDestination);

          if (entry.fileName.endsWith("/")) {
            await fsp.mkdir(this.getSafeDestinationPath(entry.fileName, resolvedDestination), {
              recursive: true,
            });
            continue;
          }

          fileCount += 1;
          totalUncompressedBytes += entry.uncompressedSize;

          if (fileCount > options.maxEntries) {
            throw new ApiError({
              statusCode: 400,
              code: "ZIP_TOO_MANY_ENTRIES",
              message: "ZIP file contains too many entries.",
            });
          }

          if (totalUncompressedBytes > options.maxExtractedSizeBytes) {
            throw new ApiError({
              statusCode: 400,
              code: "ZIP_EXTRACTED_SIZE_LIMIT_EXCEEDED",
              message: "ZIP extracted contents are too large.",
            });
          }

          await this.extractFile(zipFile, entry, resolvedDestination);
        }
      } finally {
        zipFile.close();
      }
    } catch (error) {
      await fsp.rm(resolvedDestination, { force: true, recursive: true });
      throw error;
    }

    if (fileCount === 0) {
      await fsp.rm(resolvedDestination, { force: true, recursive: true });
      throw new ApiError({
        statusCode: 400,
        code: "EMPTY_ZIP_ARCHIVE",
        message: "ZIP file does not contain repository files.",
      });
    }

    return {
      extractionPath: resolvedDestination,
      fileCount,
      totalUncompressedBytes,
    };
  }

  private openZip(zipPath: string): Promise<ZipFile> {
    return new Promise((resolve, reject) => {
      yauzl.open(zipPath, { lazyEntries: true, validateEntrySizes: true }, (error, zipFile) => {
        if (error || !zipFile) {
          reject(
            new ApiError({
              statusCode: 400,
              code: "INVALID_ZIP_ARCHIVE",
              message: "ZIP file could not be opened.",
              details: error instanceof Error ? error.message : undefined,
            }),
          );
          return;
        }

        resolve(zipFile);
      });
    });
  }

  private async *entries(zipFile: ZipFile): AsyncGenerator<Entry> {
    while (true) {
      const entry = await new Promise<Entry | null>((resolve, reject) => {
        const cleanup = () => {
          zipFile.removeListener("entry", onEntry);
          zipFile.removeListener("end", onEnd);
          zipFile.removeListener("error", onError);
        };
        const onEntry = (nextEntry: Entry) => {
          cleanup();
          resolve(nextEntry);
        };
        const onEnd = () => {
          cleanup();
          resolve(null);
        };
        const onError = (error: Error) => {
          cleanup();
          reject(error);
        };

        zipFile.once("entry", onEntry);
        zipFile.once("end", onEnd);
        zipFile.once("error", onError);
        zipFile.readEntry();
      });

      if (!entry) {
        return;
      }

      yield entry;
    }
  }

  private validateEntry(entry: Entry, destinationDirectory: string): void {
    if (entry.fileName.includes("\\")) {
      throw new ApiError({
        statusCode: 400,
        code: "UNSAFE_ZIP_ENTRY",
        message: "ZIP entries must use POSIX path separators.",
      });
    }

    this.getSafeDestinationPath(entry.fileName, destinationDirectory);

    if (this.isSymlink(entry)) {
      throw new ApiError({
        statusCode: 400,
        code: "ZIP_SYMLINK_REJECTED",
        message: "ZIP file contains symbolic links, which are not allowed.",
      });
    }

    if (!entry.fileName.endsWith("/") && this.isNestedArchive(entry.fileName)) {
      throw new ApiError({
        statusCode: 400,
        code: "NESTED_ARCHIVE_REJECTED",
        message: "Nested archives are not allowed.",
      });
    }
  }

  private async extractFile(zipFile: ZipFile, entry: Entry, destinationDirectory: string): Promise<void> {
    const destinationPath = this.getSafeDestinationPath(entry.fileName, destinationDirectory);

    await fsp.mkdir(path.dirname(destinationPath), { recursive: true });

    const readStream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => {
      zipFile.openReadStream(entry, (error, stream) => {
        if (error || !stream) {
          reject(error ?? new Error("Unable to open ZIP entry stream."));
          return;
        }

        resolve(stream);
      });
    });

    await pipeline(readStream, fs.createWriteStream(destinationPath, { flags: "wx" }));
  }

  private getSafeDestinationPath(entryName: string, destinationDirectory: string): string {
    if (
      entryName.length === 0 ||
      path.posix.isAbsolute(entryName) ||
      path.win32.isAbsolute(entryName) ||
      /^[a-zA-Z]:/.test(entryName)
    ) {
      throw new ApiError({
        statusCode: 400,
        code: "ZIP_SLIP_REJECTED",
        message: "ZIP file contains an unsafe path.",
      });
    }

    const destinationPath = path.resolve(destinationDirectory, entryName);
    const relativePath = path.relative(destinationDirectory, destinationPath);

    if (relativePath.length === 0 || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new ApiError({
        statusCode: 400,
        code: "ZIP_SLIP_REJECTED",
        message: "ZIP file contains an unsafe path.",
      });
    }

    return destinationPath;
  }

  private isNestedArchive(entryName: string): boolean {
    const lowerName = entryName.toLowerCase();

    return NESTED_ARCHIVE_EXTENSIONS.has(path.extname(lowerName)) || lowerName.endsWith(".tar.gz");
  }

  private isSymlink(entry: Entry): boolean {
    const unixMode = (entry.externalFileAttributes >>> 16) & 0o170000;

    return unixMode === 0o120000;
  }
}

export const zipExtractionService = new ZipExtractionService();

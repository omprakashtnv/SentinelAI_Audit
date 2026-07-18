import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { environment } from "../../config/environment";
import { ApiError } from "../../shared/errors/api-error";
import { ProjectRepository, projectRepository } from "../projects/project.repository";
import { UploadRepository, uploadRepository } from "./upload.repository";
import { toPublicRepositoryUpload, type RepositoryUploadResult } from "./upload.types";
import { zipExtractionService, ZipExtractionService } from "./zip-extraction.service";
import { ZIP_MIME_TYPES } from "./upload.constants";

type UploadedZipFile = {
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
};

export class UploadService {
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly uploads: UploadRepository,
    private readonly extractor: ZipExtractionService,
  ) {}

  public async uploadRepositoryZip(input: {
    ownerId: string;
    projectId: string;
    file?: UploadedZipFile;
  }): Promise<RepositoryUploadResult> {
    if (!input.file) {
      throw new ApiError({
        statusCode: 400,
        code: "ZIP_FILE_REQUIRED",
        message: "A ZIP file is required.",
      });
    }

    const uploadId = randomUUID();
    const extractionPath = path.resolve(
      process.cwd(),
      environment.upload.extractDir,
      input.ownerId,
      input.projectId,
      uploadId,
    );

    try {
      this.validateFileMetadata(input.file);
      await this.validateZipSignature(input.file.path);
      await this.ensureProjectOwnership(input.projectId, input.ownerId);

      await this.extractor.extract(input.file.path, extractionPath, {
        maxEntries: environment.upload.maxZipEntries,
        maxExtractedSizeBytes: environment.upload.maxExtractedSizeBytes,
      });

      const upload = await this.uploads.createRepositoryUpload({
        id: uploadId,
        projectId: input.projectId,
        uploadedByUserId: input.ownerId,
        originalFilename: path.basename(input.file.originalname),
        mimeType: input.file.mimetype,
        sizeBytes: input.file.size,
        extractedPath: extractionPath,
      });

      return {
        upload: toPublicRepositoryUpload(upload),
      };
    } catch (error) {
      await fs.rm(extractionPath, { force: true, recursive: true });
      throw error;
    } finally {
      await fs.rm(input.file.path, { force: true });
    }
  }

  private validateFileMetadata(file: UploadedZipFile): void {
    const extension = path.extname(file.originalname).toLowerCase();

    if (extension !== ".zip" || !ZIP_MIME_TYPES.has(file.mimetype)) {
      throw new ApiError({
        statusCode: 400,
        code: "INVALID_ZIP_UPLOAD",
        message: "Only ZIP files are accepted.",
      });
    }

    if (file.size > environment.upload.maxZipSizeBytes) {
      throw new ApiError({
        statusCode: 413,
        code: "ZIP_SIZE_LIMIT_EXCEEDED",
        message: "ZIP file must be 100 MB or smaller.",
      });
    }
  }

  private async validateZipSignature(zipPath: string): Promise<void> {
    const file = await fs.open(zipPath, "r");

    try {
      const signature = Buffer.alloc(4);
      const result = await file.read(signature, 0, 4, 0);

      if (result.bytesRead < 4 || signature[0] !== 0x50 || signature[1] !== 0x4b) {
        throw new ApiError({
          statusCode: 400,
          code: "INVALID_ZIP_SIGNATURE",
          message: "Uploaded file is not a valid ZIP archive.",
        });
      }

      const supportedSignatures = new Set(["0304", "0506", "0708"]);
      const suffix = `${signature[2]?.toString(16).padStart(2, "0")}${signature[3]
        ?.toString(16)
        .padStart(2, "0")}`;

      if (!supportedSignatures.has(suffix)) {
        throw new ApiError({
          statusCode: 400,
          code: "INVALID_ZIP_SIGNATURE",
          message: "Uploaded file is not a valid ZIP archive.",
        });
      }
    } finally {
      await file.close();
    }
  }

  private async ensureProjectOwnership(projectId: string, ownerId: string): Promise<void> {
    const project = await this.projects.findActiveByIdAndOwner(projectId, ownerId);

    if (!project) {
      throw new ApiError({
        statusCode: 404,
        code: "PROJECT_NOT_FOUND",
        message: "Project was not found.",
      });
    }
  }
}

export const uploadService = new UploadService(projectRepository, uploadRepository, zipExtractionService);


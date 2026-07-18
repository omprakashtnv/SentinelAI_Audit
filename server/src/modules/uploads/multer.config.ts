import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import multer from "multer";
import type { RequestHandler } from "express";

import { environment } from "../../config/environment";
import { ApiError } from "../../shared/errors/api-error";
import { ZIP_MIME_TYPES, ZIP_UPLOAD_FIELD_NAME } from "./upload.constants";

const tempUploadDirectory = path.resolve(process.cwd(), environment.upload.tempDir);

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    fs.mkdir(tempUploadDirectory, { recursive: true })
      .then(() => callback(null, tempUploadDirectory))
      .catch((error: unknown) => callback(error as Error, tempUploadDirectory));
  },
  filename: (_request, file, callback) => {
    callback(null, `${randomUUID()}-${sanitizeFilename(file.originalname)}`);
  },
});

const multerUpload = multer({
  storage,
  limits: {
    fileSize: environment.upload.maxZipSizeBytes,
    files: 1,
  },
  fileFilter: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (extension !== ".zip" || !ZIP_MIME_TYPES.has(file.mimetype)) {
      callback(
        new ApiError({
          statusCode: 400,
          code: "INVALID_ZIP_UPLOAD",
          message: "Only ZIP files are accepted.",
        }),
      );
      return;
    }

    callback(null, true);
  },
});

export const repositoryZipUploadMiddleware: RequestHandler = (request, response, next) => {
  multerUpload.single(ZIP_UPLOAD_FIELD_NAME)(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      next(
        new ApiError({
          statusCode: error.code === "LIMIT_FILE_SIZE" ? 413 : 400,
          code: error.code,
          message:
            error.code === "LIMIT_FILE_SIZE"
              ? "ZIP file must be 100 MB or smaller."
              : "Upload request is invalid.",
        }),
      );
      return;
    }

    next(error);
  });
};

function sanitizeFilename(filename: string): string {
  return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
}


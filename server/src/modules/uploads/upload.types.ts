import type { RepositoryUpload } from "@prisma/client";

export type PublicRepositoryUpload = {
  id: string;
  projectId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  extractionPath: string;
  createdAt: string;
};

export type RepositoryUploadResult = {
  upload: PublicRepositoryUpload;
};

export function toPublicRepositoryUpload(upload: RepositoryUpload): PublicRepositoryUpload {
  return {
    id: upload.id,
    projectId: upload.projectId,
    originalFilename: upload.originalFilename,
    mimeType: upload.mimeType,
    sizeBytes: upload.sizeBytes,
    extractionPath: upload.extractedPath,
    createdAt: upload.createdAt.toISOString(),
  };
}


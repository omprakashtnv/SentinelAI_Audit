import type { RepositoryUpload } from "@prisma/client";

import { prisma } from "../../db";

export class UploadRepository {
  public createRepositoryUpload(data: {
    id: string;
    projectId: string;
    uploadedByUserId: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    extractedPath: string;
  }): Promise<RepositoryUpload> {
    return prisma.repositoryUpload.create({
      data,
    });
  }

  public findLatestByProjectAndOwner(
    projectId: string,
    uploadedByUserId: string,
  ): Promise<RepositoryUpload | null> {
    return prisma.repositoryUpload.findFirst({
      where: {
        projectId,
        uploadedByUserId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}

export const uploadRepository = new UploadRepository();

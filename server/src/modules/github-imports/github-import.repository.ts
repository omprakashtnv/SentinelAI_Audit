import type { GitHubRepositoryImport } from "@prisma/client";

import { prisma } from "../../db";

export class GitHubImportRepository {
  public create(data: {
    id: string;
    projectId: string;
    importedByUserId: string;
    owner: string;
    name: string;
    repositoryUrl: string;
    cloneUrl: string;
    defaultBranch: string;
    commitSha: string;
    localPath: string;
  }): Promise<GitHubRepositoryImport> {
    return prisma.gitHubRepositoryImport.create({
      data,
    });
  }

  public findLatestByProjectAndOwner(
    projectId: string,
    importedByUserId: string,
  ): Promise<GitHubRepositoryImport | null> {
    return prisma.gitHubRepositoryImport.findFirst({
      where: {
        projectId,
        importedByUserId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}

export const githubImportRepository = new GitHubImportRepository();

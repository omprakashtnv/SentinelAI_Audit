import type { GitHubRepositoryImport } from "@prisma/client";

export type PublicGitHubRepositoryImport = {
  id: string;
  projectId: string;
  owner: string;
  name: string;
  repositoryUrl: string;
  cloneUrl: string;
  defaultBranch: string;
  commitSha: string;
  localPath: string;
  createdAt: string;
};

export type GitHubRepositoryImportResult = {
  repository: PublicGitHubRepositoryImport;
};

export function toPublicGitHubRepositoryImport(
  repositoryImport: GitHubRepositoryImport,
): PublicGitHubRepositoryImport {
  return {
    id: repositoryImport.id,
    projectId: repositoryImport.projectId,
    owner: repositoryImport.owner,
    name: repositoryImport.name,
    repositoryUrl: repositoryImport.repositoryUrl,
    cloneUrl: repositoryImport.cloneUrl,
    defaultBranch: repositoryImport.defaultBranch,
    commitSha: repositoryImport.commitSha,
    localPath: repositoryImport.localPath,
    createdAt: repositoryImport.createdAt.toISOString(),
  };
}

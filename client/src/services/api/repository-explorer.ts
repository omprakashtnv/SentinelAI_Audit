import { ApiClientError, apiRequest } from "@/services/api/api-client";
import type { RepositoryExplorer, RepositoryFileContent, RepositorySource } from "@/types/repository";

type RepositoryExplorerResponse = {
  repository: RepositoryExplorer;
};

type RepositorySourceResponse = {
  source: RepositorySource;
};

type RepositoryFileContentResponse = {
  file: RepositoryFileContent;
};

export async function getRepositorySource(projectId: string): Promise<RepositorySource | null> {
  try {
    const response = await apiRequest<RepositorySourceResponse>({
      path: `/projects/${projectId}/repository/source`,
    });

    return response.source;
  } catch (error) {
    if (error instanceof ApiClientError && error.code === "REPOSITORY_SOURCE_NOT_FOUND") {
      return null;
    }

    throw error;
  }
}

export async function getRepositoryExplorer(projectId: string): Promise<RepositoryExplorer> {
  const response = await apiRequest<RepositoryExplorerResponse>({
    path: `/projects/${projectId}/repository`,
  });

  return response.repository;
}

export async function getRepositoryFileContent(input: {
  projectId: string;
  relativePath: string;
}): Promise<RepositoryFileContent> {
  const response = await apiRequest<RepositoryFileContentResponse>({
    path: `/projects/${input.projectId}/repository/files`,
    params: {
      path: input.relativePath,
    },
  });

  return response.file;
}

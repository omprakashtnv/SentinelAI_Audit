import { useMutation, useQueryClient } from "@tanstack/react-query";

import { repositoryExplorerKeys } from "@/features/repository-explorer/repository-explorer.hooks";
import { projectKeys } from "@/features/projects/project.hooks";
import {
  importGitHubRepository,
  uploadRepositoryZip,
} from "@/services/api/repository-imports";
import type { RepositorySource } from "@/types/repository";

export function useUploadRepositoryZipMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { file: File; onProgress?: (progress: number) => void }) =>
      uploadRepositoryZip({
        projectId,
        file: input.file,
        onProgress: input.onProgress,
      }),
    onSuccess: (upload) => {
      const source: RepositorySource = {
        sourceType: "zip",
        displayName: upload.originalFilename,
        repositoryUrl: null,
        defaultBranch: null,
        commitSha: null,
        originalFilename: upload.originalFilename,
        sizeBytes: upload.sizeBytes,
        createdAt: upload.createdAt,
      };

      queryClient.setQueryData<RepositorySource | null>(repositoryExplorerKeys.source(projectId), source);
      void queryClient.invalidateQueries({ queryKey: repositoryExplorerKeys.project(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useImportGitHubRepositoryMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repositoryUrl: string) => importGitHubRepository({ projectId, repositoryUrl }),
    onSuccess: (repository) => {
      const source: RepositorySource = {
        sourceType: "github",
        displayName: `${repository.owner}/${repository.name}`,
        repositoryUrl: repository.repositoryUrl,
        defaultBranch: repository.defaultBranch,
        commitSha: repository.commitSha,
        originalFilename: null,
        sizeBytes: null,
        createdAt: repository.createdAt,
      };

      queryClient.setQueryData<RepositorySource | null>(repositoryExplorerKeys.source(projectId), source);
      void queryClient.invalidateQueries({ queryKey: repositoryExplorerKeys.project(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

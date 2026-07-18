import { useMutation, useQueryClient } from "@tanstack/react-query";

import { repositoryExplorerKeys } from "@/features/repository-explorer/repository-explorer.hooks";
import { projectKeys } from "@/features/projects/project.hooks";
import {
  importGitHubRepository,
  uploadRepositoryZip,
} from "@/services/api/repository-imports";

export function useUploadRepositoryZipMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { file: File; onProgress?: (progress: number) => void }) =>
      uploadRepositoryZip({
        projectId,
        file: input.file,
        onProgress: input.onProgress,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: repositoryExplorerKeys.project(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useImportGitHubRepositoryMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repositoryUrl: string) => importGitHubRepository({ projectId, repositoryUrl }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: repositoryExplorerKeys.project(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

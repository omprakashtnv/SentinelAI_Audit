import { useQuery } from "@tanstack/react-query";

import {
  getRepositoryExplorer,
  getRepositoryFileContent,
  getRepositorySource,
} from "@/services/api/repository-explorer";

export const repositoryExplorerKeys = {
  all: ["repository-explorer"] as const,
  project: (projectId: string) => [...repositoryExplorerKeys.all, "project", projectId] as const,
  source: (projectId: string) => [...repositoryExplorerKeys.project(projectId), "source"] as const,
  file: (projectId: string, relativePath: string) =>
    [...repositoryExplorerKeys.project(projectId), "file", relativePath] as const,
};

export function useRepositorySourceQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId
      ? repositoryExplorerKeys.source(projectId)
      : [...repositoryExplorerKeys.all, "source", "missing"],
    queryFn: () => getRepositorySource(projectId ?? ""),
    enabled: Boolean(projectId),
    retry: false,
  });
}

export function useRepositoryExplorerQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId
      ? repositoryExplorerKeys.project(projectId)
      : [...repositoryExplorerKeys.all, "missing"],
    queryFn: () => getRepositoryExplorer(projectId ?? ""),
    enabled: Boolean(projectId),
  });
}

export function useRepositoryFileContentQuery(input: {
  projectId: string | undefined;
  relativePath: string | null;
}) {
  return useQuery({
    queryKey:
      input.projectId && input.relativePath
        ? repositoryExplorerKeys.file(input.projectId, input.relativePath)
        : [...repositoryExplorerKeys.all, "file", "missing"],
    queryFn: () =>
      getRepositoryFileContent({
        projectId: input.projectId ?? "",
        relativePath: input.relativePath ?? "",
      }),
    enabled: Boolean(input.projectId && input.relativePath),
  });
}

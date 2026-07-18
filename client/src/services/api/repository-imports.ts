import { api, apiRequest, normalizeApiError } from "@/services/api/api-client";
import type { ApiSuccessResponse } from "@/types/api";
import type { GitHubRepositoryImport, RepositoryUpload } from "@/types/repository-import";

type UploadRepositoryZipResponse = {
  upload: RepositoryUpload;
};

type ImportGitHubRepositoryResponse = {
  repository: GitHubRepositoryImport;
};

export async function uploadRepositoryZip(input: {
  projectId: string;
  file: File;
  onProgress?: (progress: number) => void;
}): Promise<RepositoryUpload> {
  const formData = new FormData();
  formData.append("file", input.file);

  try {
    const response = await api.request<ApiSuccessResponse<UploadRepositoryZipResponse>>({
      url: `/uploads/projects/${input.projectId}/repository-upload`,
      method: "POST",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (event) => {
        if (!event.total) {
          return;
        }

        input.onProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });

    return response.data.data.upload;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function importGitHubRepository(input: {
  projectId: string;
  repositoryUrl: string;
}): Promise<GitHubRepositoryImport> {
  const response = await apiRequest<ImportGitHubRepositoryResponse>({
    path: `/projects/${input.projectId}/github-import`,
    method: "POST",
    data: {
      repositoryUrl: input.repositoryUrl,
    },
  });

  return response.repository;
}

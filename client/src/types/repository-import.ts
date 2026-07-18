export type RepositoryUpload = {
  id: string;
  projectId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  extractionPath: string;
  createdAt: string;
};

export type GitHubRepositoryImport = {
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

export type RepositoryImportResult =
  | {
      source: "zip";
      upload: RepositoryUpload;
    }
  | {
      source: "github";
      repository: GitHubRepositoryImport;
    };

import fs from "node:fs/promises";

import { ApiError } from "../../shared/errors/api-error";
import { GitHubImportRepository, githubImportRepository } from "../github-imports/github-import.repository";
import { ProjectRepository, projectRepository } from "../projects/project.repository";
import { repositoryParserService, RepositoryParserService } from "../repository-parser";
import { UploadRepository, uploadRepository } from "../uploads/upload.repository";
import type {
  PublicRepositoryExplorer,
  PublicRepositorySource,
  RepositoryFileContent,
  RepositorySource,
} from "./repository-explorer.types";

export class RepositoryExplorerService {
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly uploads: UploadRepository,
    private readonly githubImports: GitHubImportRepository,
    private readonly parser: RepositoryParserService,
  ) {}

  public async getRepository(ownerId: string, projectId: string): Promise<PublicRepositoryExplorer> {
    const source = await this.resolveRepositorySource(ownerId, projectId);

    try {
      const parsedRepository = await this.parser.parseRepository(source.rootPath);

      return {
        rootPath: source.displayName,
        tree: parsedRepository.tree,
        files: parsedRepository.files,
        summary: parsedRepository.summary,
      };
    } catch (error) {
      this.throwRepositorySourceUnavailable(error);
    }
  }

  public async getRepositorySource(ownerId: string, projectId: string): Promise<PublicRepositorySource> {
    const source = await this.resolveRepositorySource(ownerId, projectId);

    return {
      sourceType: source.sourceType,
      displayName: source.displayName,
      repositoryUrl: source.repositoryUrl,
      defaultBranch: source.defaultBranch,
      commitSha: source.commitSha,
      originalFilename: source.originalFilename,
      sizeBytes: source.sizeBytes,
      createdAt: source.createdAt.toISOString(),
    };
  }

  public async getFileContent(input: {
    ownerId: string;
    projectId: string;
    relativePath: string;
  }): Promise<RepositoryFileContent> {
    const source = await this.resolveRepositorySource(input.ownerId, input.projectId);

    try {
      const parsedFile = await this.parser.parseFile(source.rootPath, input.relativePath);
      const content = await fs.readFile(parsedFile.absolutePath, "utf8");

      return {
        ...parsedFile.metadata,
        content,
      };
    } catch (error) {
      this.throwRepositorySourceUnavailable(error);
    }
  }

  private async resolveRepositorySource(ownerId: string, projectId: string): Promise<RepositorySource> {
    const project = await this.projects.findActiveByIdAndOwner(projectId, ownerId);

    if (!project) {
      throw new ApiError({
        statusCode: 404,
        code: "PROJECT_NOT_FOUND",
        message: "Project was not found.",
      });
    }

    const [latestUpload, latestGitHubImport] = await Promise.all([
      this.uploads.findLatestByProjectAndOwner(projectId, ownerId),
      this.githubImports.findLatestByProjectAndOwner(projectId, ownerId),
    ]);

    const sources: RepositorySource[] = [];

    if (latestUpload) {
      sources.push({
        displayName: latestUpload.originalFilename,
        sourceType: "zip",
        rootPath: latestUpload.extractedPath,
        repositoryUrl: null,
        defaultBranch: null,
        commitSha: null,
        originalFilename: latestUpload.originalFilename,
        sizeBytes: latestUpload.sizeBytes,
        createdAt: latestUpload.createdAt,
      });
    }

    if (latestGitHubImport) {
      sources.push({
        displayName: `${latestGitHubImport.owner}/${latestGitHubImport.name}`,
        sourceType: "github",
        rootPath: latestGitHubImport.localPath,
        repositoryUrl: latestGitHubImport.repositoryUrl,
        defaultBranch: latestGitHubImport.defaultBranch,
        commitSha: latestGitHubImport.commitSha,
        originalFilename: null,
        sizeBytes: null,
        createdAt: latestGitHubImport.createdAt,
      });
    }

    const latestSource = sources.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];

    if (!latestSource) {
      throw new ApiError({
        statusCode: 404,
        code: "REPOSITORY_SOURCE_NOT_FOUND",
        message: "No uploaded or imported repository was found for this project.",
      });
    }

    return latestSource;
  }

  private throwRepositorySourceUnavailable(error: unknown): never {
    if (error instanceof ApiError && error.code !== "INVALID_REPOSITORY_PATH") {
      throw error;
    }

    throw new ApiError({
      statusCode: 404,
      code: "REPOSITORY_SOURCE_UNAVAILABLE",
      message: "Repository source files are unavailable.",
    });
  }
}

export const repositoryExplorerService = new RepositoryExplorerService(
  projectRepository,
  uploadRepository,
  githubImportRepository,
  repositoryParserService,
);

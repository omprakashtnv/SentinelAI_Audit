import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import simpleGit, { type SimpleGit } from "simple-git";

import { environment } from "../../config/environment";
import { ApiError } from "../../shared/errors/api-error";
import { logger } from "../../shared/logger/logger";
import { ProjectRepository, projectRepository } from "../projects/project.repository";
import { GitHubImportRepository, githubImportRepository } from "./github-import.repository";
import { parseGitHubRepositoryUrl, type ParsedGitHubRepositoryUrl } from "./github-url";
import type { ImportGitHubRepositoryInput } from "./github-import.schemas";
import {
  toPublicGitHubRepositoryImport,
  type GitHubRepositoryImportResult,
} from "./github-import.types";

type ImportGitHubRepositoryCommand = {
  ownerId: string;
  projectId: string;
  input: ImportGitHubRepositoryInput;
};

export class GitHubImportService {
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly imports: GitHubImportRepository,
  ) {}

  public async importRepository(command: ImportGitHubRepositoryCommand): Promise<GitHubRepositoryImportResult> {
    const repository = parseGitHubRepositoryUrl(command.input.repositoryUrl);
    await this.ensureProjectOwnership(command.projectId, command.ownerId);

    const defaultBranch = await this.getDefaultBranch(repository.cloneUrl);
    const importId = randomUUID();
    const localPath = path.resolve(
      process.cwd(),
      environment.githubImport.baseDir,
      command.ownerId,
      command.projectId,
      importId,
    );

    try {
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await this.cloneRepository(repository, defaultBranch, localPath);

      const commitSha = await this.getHeadCommitSha(localPath);
      const repositoryImport = await this.imports.create({
        id: importId,
        projectId: command.projectId,
        importedByUserId: command.ownerId,
        owner: repository.owner,
        name: repository.name,
        repositoryUrl: repository.repositoryUrl,
        cloneUrl: repository.cloneUrl,
        defaultBranch,
        commitSha,
        localPath,
      });

      return {
        repository: toPublicGitHubRepositoryImport(repositoryImport),
      };
    } catch (error) {
      await fs.rm(localPath, { force: true, recursive: true });

      if (error instanceof ApiError) {
        throw error;
      }

      logger.warn("GitHub repository import failed.", {
        error,
        projectId: command.projectId,
        repositoryUrl: repository.repositoryUrl,
      });

      throw new ApiError({
        statusCode: 502,
        code: "GITHUB_CLONE_FAILED",
        message: "GitHub repository could not be cloned.",
      });
    }
  }

  private async ensureProjectOwnership(projectId: string, ownerId: string): Promise<void> {
    const project = await this.projects.findActiveByIdAndOwner(projectId, ownerId);

    if (!project) {
      throw new ApiError({
        statusCode: 404,
        code: "PROJECT_NOT_FOUND",
        message: "Project was not found.",
      });
    }
  }

  private async getDefaultBranch(cloneUrl: string): Promise<string> {
    try {
      const output = await this.runGitOperation(
        process.cwd(),
        (git) => git.raw(["ls-remote", "--symref", cloneUrl, "HEAD"]),
        "GitHub repository lookup timed out.",
      );
      const defaultBranch = this.parseDefaultBranch(output);

      if (!defaultBranch) {
        throw new Error("Unable to parse default branch from ls-remote output.");
      }

      return defaultBranch;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (this.isGitTimeout(error)) {
        throw new ApiError({
          statusCode: 504,
          code: "GITHUB_IMPORT_TIMEOUT",
          message: "GitHub repository lookup timed out.",
        });
      }

      throw new ApiError({
        statusCode: 404,
        code: "GITHUB_REPOSITORY_NOT_FOUND",
        message: "GitHub repository was not found or is not public.",
      });
    }
  }

  private parseDefaultBranch(output: string): string | null {
    const refLine = output
      .split(/\r?\n/)
      .find((line) => line.startsWith("ref: refs/heads/") && line.endsWith("\tHEAD"));

    if (!refLine) {
      return null;
    }

    return refLine.replace("ref: refs/heads/", "").replace(/\tHEAD$/, "");
  }

  private async cloneRepository(
    repository: ParsedGitHubRepositoryUrl,
    defaultBranch: string,
    localPath: string,
  ): Promise<void> {
    try {
      await this.runGitOperation(
        process.cwd(),
        (git) =>
          git.clone(repository.cloneUrl, localPath, [
            "--depth",
            "1",
            "--branch",
            defaultBranch,
            "--single-branch",
          ]),
        "GitHub repository clone timed out.",
      );

      await this.runGitOperation(
        localPath,
        (git) => git.checkout(defaultBranch),
        "GitHub repository checkout timed out.",
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (this.isGitTimeout(error)) {
        throw new ApiError({
          statusCode: 504,
          code: "GITHUB_IMPORT_TIMEOUT",
          message: "GitHub repository clone timed out.",
        });
      }

      throw new ApiError({
        statusCode: 502,
        code: "GITHUB_CLONE_FAILED",
        message: "GitHub repository could not be cloned.",
      });
    }
  }

  private async getHeadCommitSha(localPath: string): Promise<string> {
    const commitSha = (
      await this.runGitOperation(
        localPath,
        (git) => git.revparse(["HEAD"]),
        "GitHub repository metadata lookup timed out.",
      )
    ).trim();

    if (!/^[0-9a-f]{40}$/i.test(commitSha)) {
      throw new ApiError({
        statusCode: 502,
        code: "GITHUB_INVALID_COMMIT",
        message: "GitHub repository clone did not produce a valid commit SHA.",
      });
    }

    return commitSha;
  }

  private async runGitOperation<T>(
    baseDir: string,
    operation: (git: SimpleGit) => Promise<T>,
    timeoutMessage: string,
  ): Promise<T> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), environment.githubImport.timeoutMs);

    try {
      return await operation(this.createGitClient(baseDir, abortController.signal));
    } catch (error) {
      if (abortController.signal.aborted || this.isGitTimeout(error)) {
        throw new ApiError({
          statusCode: 504,
          code: "GITHUB_IMPORT_TIMEOUT",
          message: timeoutMessage,
        });
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private createGitClient(baseDir: string, abortSignal: AbortSignal): SimpleGit {
    return simpleGit({
      baseDir,
      abort: abortSignal,
      maxConcurrentProcesses: 1,
      timeout: {
        block: environment.githubImport.timeoutMs,
      },
    });
  }

  private isGitTimeout(error: unknown): boolean {
    return error instanceof Error && error.message.toLowerCase().includes("timeout");
  }
}

export const githubImportService = new GitHubImportService(projectRepository, githubImportRepository);

import { z } from "zod";

export const githubImportProjectParamsSchema = z
  .object({
    projectId: z.string().uuid("Project ID must be a valid UUID."),
  })
  .strict();

export const importGitHubRepositorySchema = z
  .object({
    repositoryUrl: z
      .string()
      .trim()
      .url("Repository URL must be a valid URL.")
      .max(2048, "Repository URL must be 2048 characters or fewer."),
  })
  .strict();

export type GitHubImportProjectParams = z.infer<typeof githubImportProjectParamsSchema>;
export type ImportGitHubRepositoryInput = z.infer<typeof importGitHubRepositorySchema>;

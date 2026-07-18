import { z } from "zod";

export const repositoryExplorerProjectParamsSchema = z
  .object({
    projectId: z.string().uuid("Project ID must be a valid UUID."),
  })
  .strict();

export const repositoryFileQuerySchema = z
  .object({
    path: z.string().trim().min(1, "File path is required.").max(2048, "File path is too long."),
  })
  .strict();

export type RepositoryExplorerProjectParams = z.infer<typeof repositoryExplorerProjectParamsSchema>;
export type RepositoryFileQuery = z.infer<typeof repositoryFileQuerySchema>;

import { z } from "zod";

export const uploadProjectParamsSchema = z
  .object({
    projectId: z.string().uuid("Project ID must be a valid UUID."),
  })
  .strict();

export type UploadProjectParams = z.infer<typeof uploadProjectParamsSchema>;


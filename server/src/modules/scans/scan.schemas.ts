import { z } from "zod";

export const scanProjectParamsSchema = z
  .object({
    projectId: z.string().uuid("Project ID must be a valid UUID."),
  })
  .strict();

export const scanParamsSchema = z
  .object({
    projectId: z.string().uuid("Project ID must be a valid UUID."),
    scanId: z.string().uuid("Scan ID must be a valid UUID."),
  })
  .strict();

export const scanListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

export type ScanProjectParams = z.infer<typeof scanProjectParamsSchema>;
export type ScanParams = z.infer<typeof scanParamsSchema>;
export type ScanListQuery = z.infer<typeof scanListQuerySchema>;

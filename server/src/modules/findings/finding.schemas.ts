import { z } from "zod";

export const findingSeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]);
export const findingStatusSchema = z.enum(["OPEN", "DISMISSED", "RESOLVED"]);
export const findingConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);

export const findingProjectParamsSchema = z
  .object({
    projectId: z.string().uuid("Project ID must be a valid UUID."),
  })
  .strict();

export const findingParamsSchema = z
  .object({
    projectId: z.string().uuid("Project ID must be a valid UUID."),
    findingId: z.string().uuid("Finding ID must be a valid UUID."),
  })
  .strict();

export const createFindingSchema = z
  .object({
    scanId: z.string().uuid("Scan ID must be a valid UUID.").optional(),
    ruleId: z.string().trim().min(1).max(160).optional(),
    severity: findingSeveritySchema,
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().min(1),
    file: z.string().trim().min(1),
    line: z.number().int().positive(),
    category: z.string().trim().min(1).max(80).optional(),
    owasp: z.string().trim().min(1).max(160).optional(),
    recommendation: z.string().trim().min(1).optional(),
    confidence: findingConfidenceSchema.optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

export const updateFindingSchema = createFindingSchema
  .omit({
    scanId: true,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const getFindingsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: findingStatusSchema.optional(),
    severity: findingSeveritySchema.optional(),
    scanId: z.string().uuid("Scan ID must be a valid UUID.").optional(),
    search: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export type CreateFindingInput = z.infer<typeof createFindingSchema>;
export type UpdateFindingInput = z.infer<typeof updateFindingSchema>;
export type GetFindingsQuery = z.infer<typeof getFindingsQuerySchema>;
export type FindingSeverityInput = z.infer<typeof findingSeveritySchema>;
export type FindingStatusInput = z.infer<typeof findingStatusSchema>;


import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Project name is required.")
  .max(120, "Project name is too long.");

const createRepositoryUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z
    .string()
    .trim()
    .url("Repository URL must be a valid URL.")
    .max(2048, "Repository URL is too long.")
    .optional(),
);

const updateRepositoryUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
  z
    .union([
    z
      .string()
      .trim()
      .url("Repository URL must be a valid URL.")
      .max(2048, "Repository URL is too long."),
    z.null(),
  ])
    .optional(),
);

const createDescriptionSchema = z
  .string()
  .trim()
  .max(10_000, "Description is too long.")
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

const updateDescriptionSchema = z
  .string()
  .trim()
  .max(10_000, "Description is too long.")
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

const meaningfulUpdateValue = (value: unknown): boolean => value !== undefined;

export const projectIdParamsSchema = z.object({
  projectId: z.string().uuid("Project ID must be a valid UUID."),
}).strict();

export const getProjectsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: optionalText,
});

export const createProjectSchema = z.object({
  name: projectNameSchema,
  description: createDescriptionSchema,
  repositoryUrl: createRepositoryUrlSchema,
}).strict();

export const updateProjectSchema = z
  .object({
    name: projectNameSchema.optional(),
    description: updateDescriptionSchema,
    repositoryUrl: updateRepositoryUrlSchema,
  })
  .strict()
  .refine((value) => Object.values(value).some(meaningfulUpdateValue), {
    message: "At least one field must be provided.",
  });

export type ProjectIdParams = z.infer<typeof projectIdParamsSchema>;
export type GetProjectsQuery = z.infer<typeof getProjectsQuerySchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

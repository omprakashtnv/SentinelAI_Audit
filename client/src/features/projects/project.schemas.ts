import { z } from "zod";

export const projectFormSchema = z.object({
  name: z.string().trim().min(1, "Project name is required.").max(120, "Project name is too long."),
  description: z.string().trim().max(10_000, "Description is too long.").optional(),
  repositoryUrl: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || z.string().url().safeParse(value).success, {
      message: "Enter a valid repository URL.",
    })
    .optional(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export function normalizeProjectFormValues(values: ProjectFormValues) {
  return {
    name: values.name.trim(),
    description: values.description?.trim() ? values.description.trim() : undefined,
    repositoryUrl: values.repositoryUrl?.trim() ? values.repositoryUrl.trim() : undefined,
  };
}

export function normalizeProjectUpdateValues(values: ProjectFormValues) {
  return {
    name: values.name.trim(),
    description: values.description?.trim() ? values.description.trim() : null,
    repositoryUrl: values.repositoryUrl?.trim() ? values.repositoryUrl.trim() : null,
  };
}


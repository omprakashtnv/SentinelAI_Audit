import { z } from "zod";

const MAX_ZIP_SIZE_BYTES = 100 * 1024 * 1024;

export const githubRepositoryImportSchema = z.object({
  repositoryUrl: z
    .string()
    .trim()
    .url("Enter a valid repository URL.")
    .refine((value) => {
      try {
        const url = new URL(value);
        const segments = url.pathname.split("/").filter(Boolean);

        return (
          url.protocol === "https:" &&
          url.hostname.toLowerCase() === "github.com" &&
          segments.length === 2 &&
          !url.search &&
          !url.hash
        );
      } catch {
        return false;
      }
    }, "Enter a public GitHub repository URL."),
});

export type GitHubRepositoryImportValues = z.infer<typeof githubRepositoryImportSchema>;

export function validateZipFile(file: File | null): string | null {
  if (!file) {
    return "Select a ZIP file.";
  }

  if (!file.name.toLowerCase().endsWith(".zip")) {
    return "Only ZIP files are supported.";
  }

  if (file.size > MAX_ZIP_SIZE_BYTES) {
    return "ZIP file must be 100 MB or smaller.";
  }

  return null;
}

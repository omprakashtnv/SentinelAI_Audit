import { BaseLanguageAdapter } from "./base-language.adapter";
import type { LanguageAdapterInput } from "./language-adapter.types";

export class TypeScriptLanguageAdapter extends BaseLanguageAdapter {
  public readonly id = "typescript";
  public readonly displayName = "TypeScript";
  public readonly runtime = "node";
  public readonly supportedExtensions = [".ts", ".tsx"] as const;

  protected getSecureCode(input: LanguageAdapterInput): string {
    if (input.category === "validation") {
      return [
        "import { z } from \"zod\";",
        "",
        "const requestSchema = z.object({",
        "  name: z.string().trim().min(1).max(120),",
        "});",
        "",
        "type RequestDto = z.infer<typeof requestSchema>;",
        "",
        "export function parseRequest(input: unknown): RequestDto {",
        "  return requestSchema.parse(input);",
        "}",
      ].join("\n");
    }

    if (input.category === "secrets" || input.category === "jwt") {
      return [
        "const requiredSecret = process.env.JWT_ACCESS_SECRET;",
        "",
        "if (!requiredSecret || requiredSecret.length < 32) {",
        "  throw new Error(\"JWT_ACCESS_SECRET must be configured with at least 32 characters.\");",
        "}",
        "",
        "export const jwtAccessSecret = requiredSecret;",
      ].join("\n");
    }

    return [
      "type SecureResult<T> = {",
      "  data: T;",
      "  handledSecurely: true;",
      "};",
      "",
      "export function buildSecureResult<T>(data: T): SecureResult<T> {",
      "  return { data, handledSecurely: true };",
      "}",
    ].join("\n");
  }

  protected getBestPractices(_input: LanguageAdapterInput): string[] {
    return [
      "Keep strict TypeScript enabled and avoid any for security-sensitive DTOs.",
      "Model trusted and untrusted data as separate types.",
      "Use exhaustive checks for security state machines and authorization decisions.",
    ];
  }

  protected getFrameworkRecommendations(input: LanguageAdapterInput): string[] {
    return [
      "Put runtime validation at module boundaries because TypeScript types are erased at runtime.",
      "Prefer readonly DTOs and immutable transformations for parsed request data.",
      `Keep fixes near the owning module${input.filePath ? ` for ${input.filePath}` : ""}.`,
    ];
  }

  protected override getRequiredDependencies(input: LanguageAdapterInput): string[] {
    return input.category === "validation" ? ["zod"] : [];
  }
}

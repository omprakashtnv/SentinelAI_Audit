import { BaseLanguageAdapter } from "./base-language.adapter";
import type { LanguageAdapterInput } from "./language-adapter.types";

export class JavaScriptLanguageAdapter extends BaseLanguageAdapter {
  public readonly id = "javascript";
  public readonly displayName = "JavaScript";
  public readonly runtime = "node";
  public readonly supportedExtensions = [".js", ".jsx", ".mjs", ".cjs"] as const;

  protected getSecureCode(input: LanguageAdapterInput): string {
    if (input.category === "injection") {
      return [
        "const allowedOperations = Object.freeze({",
        "  ping: () => ({ ok: true }),",
        "});",
        "",
        "export function runAllowedOperation(operationName) {",
        "  const operation = allowedOperations[operationName];",
        "",
        "  if (!operation) {",
        "    throw new Error(\"Unsupported operation.\");",
        "  }",
        "",
        "  return operation();",
        "}",
      ].join("\n");
    }

    if (input.category === "validation") {
      return [
        "import { z } from \"zod\";",
        "",
        "const schema = z.object({",
        "  name: z.string().trim().min(1).max(120),",
        "});",
        "",
        "export function parsePayload(payload) {",
        "  return schema.parse(payload);",
        "}",
      ].join("\n");
    }

    return [
      "export function assertConfigured(value, name) {",
      "  if (typeof value !== \"string\" || value.trim().length === 0) {",
      "    throw new Error(`${name} must be configured.`);",
      "  }",
      "",
      "  return value;",
      "}",
    ].join("\n");
  }

  protected getBestPractices(_input: LanguageAdapterInput): string[] {
    return [
      "Validate all untrusted input at runtime.",
      "Prefer const, module boundaries, and small pure functions for security-sensitive logic.",
      "Avoid dynamic property access for authorization, query, or command decisions unless values are allowlisted.",
    ];
  }

  protected getFrameworkRecommendations(_input: LanguageAdapterInput): string[] {
    return [
      "Use JSDoc or TypeScript migration for critical modules when possible.",
      "Keep dangerous operations in small wrappers with tests.",
      "Enable lint rules that block eval, console logs in production code, and unsafe process execution.",
    ];
  }

  protected override getRequiredDependencies(input: LanguageAdapterInput): string[] {
    return input.category === "validation" ? ["zod"] : [];
  }
}

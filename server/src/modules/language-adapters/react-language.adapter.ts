import { BaseLanguageAdapter } from "./base-language.adapter";
import type { LanguageAdapterInput } from "./language-adapter.types";

export class ReactLanguageAdapter extends BaseLanguageAdapter {
  public readonly id = "react";
  public readonly displayName = "React";
  public readonly runtime = "react";
  public readonly supportedExtensions = [".tsx", ".jsx"] as const;

  public override supports(input: LanguageAdapterInput): boolean {
    if (input.category === "react" || input.category === "xss") {
      return true;
    }

    return super.supports(input);
  }

  protected getSecureCode(input: LanguageAdapterInput): string {
    if (input.category === "xss" || input.ruleId === "xss.dangerously-set-inner-html") {
      return [
        "type SafeTextProps = {",
        "  value: string | null | undefined;",
        "};",
        "",
        "export function SafeText({ value }: SafeTextProps) {",
        "  return <span>{value ?? \"\"}</span>;",
        "}",
      ].join("\n");
    }

    return [
      "import { z } from \"zod\";",
      "",
      "const apiResponseSchema = z.object({",
      "  id: z.string(),",
      "  name: z.string(),",
      "});",
      "",
      "export function parseApiResponse(input: unknown) {",
      "  return apiResponseSchema.parse(input);",
      "}",
    ].join("\n");
  }

  protected getBestPractices(_input: LanguageAdapterInput): string[] {
    return [
      "Render untrusted content as JSX text so React can escape it.",
      "Keep dangerous HTML rendering behind a reviewed component with sanitizer tests.",
      "Never place private keys, provider tokens, or server secrets in Vite client environment variables.",
    ];
  }

  protected getFrameworkRecommendations(_input: LanguageAdapterInput): string[] {
    return [
      "Use React Hook Form and Zod for user input validation before mutation calls.",
      "Validate security-sensitive API responses before rendering privileged UI state.",
      "Store access tokens in memory and rely on HTTP-only cookies for refresh tokens.",
    ];
  }

  protected override getRequiredDependencies(input: LanguageAdapterInput): string[] {
    if (input.category === "validation") {
      return ["zod", "react-hook-form", "@hookform/resolvers"];
    }

    return [];
  }
}

import { BaseLanguageAdapter } from "./base-language.adapter";
import type { LanguageAdapterInput } from "./language-adapter.types";

export class ExpressLanguageAdapter extends BaseLanguageAdapter {
  public readonly id = "express";
  public readonly displayName = "Express";
  public readonly runtime = "express";
  public readonly supportedExtensions = [".ts", ".js"] as const;

  public override supports(input: LanguageAdapterInput): boolean {
    if (["express", "helmet", "cors", "rate_limiting", "validation", "csrf"].includes(input.category ?? "")) {
      return true;
    }

    return Boolean(input.filePath?.toLowerCase().includes("server") || input.filePath?.toLowerCase().includes("app"));
  }

  protected getSecureCode(input: LanguageAdapterInput): string {
    if (input.category === "helmet" || input.ruleId === "config.missing-helmet") {
      return [
        "import helmet from \"helmet\";",
        "",
        "app.disable(\"x-powered-by\");",
        "app.use(",
        "  helmet({",
        "    contentSecurityPolicy: process.env.NODE_ENV === \"production\" ? undefined : false,",
        "    hsts: process.env.NODE_ENV === \"production\",",
        "  }),",
        ");",
      ].join("\n");
    }

    if (input.category === "cors" || input.ruleId === "config.weak-cors") {
      return [
        "import cors from \"cors\";",
        "",
        "const allowedOrigins = new Set(config.cors.allowedOrigins);",
        "",
        "app.use(",
        "  cors({",
        "    credentials: true,",
        "    origin(origin, callback) {",
        "      if (!origin || allowedOrigins.has(origin)) {",
        "        callback(null, true);",
        "        return;",
        "      }",
        "",
        "      callback(new Error(\"Origin is not allowed by CORS.\"));",
        "    },",
        "  }),",
        ");",
      ].join("\n");
    }

    if (input.category === "rate_limiting" || input.ruleId === "config.missing-rate-limiter") {
      return [
        "import rateLimit from \"express-rate-limit\";",
        "",
        "const apiLimiter = rateLimit({",
        "  windowMs: 15 * 60 * 1000,",
        "  limit: 300,",
        "  standardHeaders: true,",
        "  legacyHeaders: false,",
        "});",
        "",
        "app.use(\"/api\", apiLimiter);",
      ].join("\n");
    }

    return [
      "import { z } from \"zod\";",
      "",
      "const bodySchema = z.object({",
      "  name: z.string().trim().min(1).max(120),",
      "});",
      "",
      "app.post(\"/api/resources\", validateRequest({ body: bodySchema }), asyncHandler(controller.create));",
    ].join("\n");
  }

  protected getBestPractices(_input: LanguageAdapterInput): string[] {
    return [
      "Register security middleware before routers.",
      "Keep controllers thin and move authorization, validation, and persistence into dedicated layers.",
      "Use centralized error middleware for all operational failures.",
    ];
  }

  protected getFrameworkRecommendations(_input: LanguageAdapterInput): string[] {
    return [
      "Call app.disable(\"x-powered-by\") during app bootstrap.",
      "Apply body parser limits before route handlers.",
      "Use asyncHandler for every asynchronous controller.",
      "Use route-specific rate limiters for authentication, uploads, imports, and scan triggers.",
    ];
  }

  protected override getRequiredDependencies(input: LanguageAdapterInput): string[] {
    const dependencies = ["helmet", "cors", "express-rate-limit"];

    if (input.category === "validation") {
      dependencies.push("zod");
    }

    return dependencies;
  }
}

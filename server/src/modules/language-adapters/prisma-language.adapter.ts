import { BaseLanguageAdapter } from "./base-language.adapter";
import type { LanguageAdapterInput } from "./language-adapter.types";

export class PrismaLanguageAdapter extends BaseLanguageAdapter {
  public readonly id = "prisma";
  public readonly displayName = "Prisma";
  public readonly runtime = "prisma";
  public readonly supportedExtensions = [".prisma", ".ts", ".js"] as const;

  public override supports(input: LanguageAdapterInput): boolean {
    if (input.category === "prisma" || input.category === "sql_injection") {
      return true;
    }

    return Boolean(input.filePath?.toLowerCase().includes("prisma"));
  }

  protected getSecureCode(input: LanguageAdapterInput): string {
    if (input.ruleId === "database.query-raw-unsafe" || input.category === "sql_injection") {
      return [
        "export async function findUserByEmail(email: string) {",
        "  return prisma.user.findUnique({",
        "    where: { email },",
        "    select: {",
        "      id: true,",
        "      email: true,",
        "      name: true,",
        "      createdAt: true,",
        "    },",
        "  });",
        "}",
      ].join("\n");
    }

    return [
      "const allowedSortFields = new Set([\"createdAt\", \"updatedAt\", \"name\"]);",
      "",
      "export async function listProjectsForUser(userId: string, sortBy: string) {",
      "  const orderBy = allowedSortFields.has(sortBy) ? sortBy : \"createdAt\";",
      "",
      "  return prisma.project.findMany({",
      "    where: { ownerId: userId, deletedAt: null },",
      "    orderBy: { [orderBy]: \"desc\" },",
      "  });",
      "}",
    ].join("\n");
  }

  protected getBestPractices(_input: LanguageAdapterInput): string[] {
    return [
      "Prefer Prisma model APIs for reads and writes.",
      "Keep raw SQL isolated inside repository methods.",
      "Select only fields that are safe to return to the caller.",
      "Use owner constraints in every tenant-owned query.",
    ];
  }

  protected getFrameworkRecommendations(_input: LanguageAdapterInput): string[] {
    return [
      "Use $queryRaw tagged templates only for parameterized raw queries.",
      "Avoid $queryRawUnsafe in application code.",
      "Allowlist dynamic orderBy fields before building Prisma query objects.",
      "Wrap multi-step writes in Prisma transactions.",
    ];
  }

  protected override getRequiredDependencies(_input: LanguageAdapterInput): string[] {
    return ["@prisma/client"];
  }
}

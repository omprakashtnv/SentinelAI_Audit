import { PrismaClient } from "@prisma/client";

import { environment } from "../config/environment";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: environment.isDevelopment
      ? [
          { emit: "event", level: "query" },
          { emit: "stdout", level: "warn" },
          { emit: "stdout", level: "error" },
        ]
      : [
          { emit: "stdout", level: "warn" },
          { emit: "stdout", level: "error" },
        ],
  });

if (!environment.isProduction) {
  globalForPrisma.prisma = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

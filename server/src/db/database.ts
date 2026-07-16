import type { Prisma } from "@prisma/client";

import { logger } from "../shared/logger/logger";
import { prisma } from "./prisma";

export type DatabaseHealth = {
  status: "ok" | "error";
  latencyMs: number;
};

export type TransactionClient = Prisma.TransactionClient;

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info("Database connection established");
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info("Database connection closed");
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const startedAt = performance.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return {
      status: "ok",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    logger.error("Database health check failed", { error });

    return {
      status: "error",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}

export async function withTransaction<TResult>(
  operation: (tx: TransactionClient) => Promise<TResult>,
): Promise<TResult> {
  return prisma.$transaction(operation, {
    maxWait: 5_000,
    timeout: 10_000,
  });
}


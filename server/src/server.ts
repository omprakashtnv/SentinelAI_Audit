import http from "node:http";

import { createApp } from "./app";
import { environment } from "./config/environment";
import { disconnectPrisma } from "./db/prisma";
import { logger } from "./shared/logger/logger";

const app = createApp();
const server = http.createServer(app);

let isShuttingDown = false;

function closeServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info("Graceful shutdown started", { signal });

  const forceExitTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out. Forcing process exit.", {
      timeoutMs: environment.shutdownGraceMs,
    });
    process.exit(1);
  }, environment.shutdownGraceMs);

  forceExitTimer.unref();

  try {
    await closeServer();
    await disconnectPrisma();
    clearTimeout(forceExitTimer);
    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExitTimer);
    logger.error("Graceful shutdown failed", { error });
    process.exit(1);
  }
}

server.listen(environment.port, () => {
  logger.info(`Server started on Port ${environment.port}`, {
    environment: environment.nodeEnv,
    port: environment.port,
  });
});

process.on("SIGINT", (signal) => {
  void shutdown(signal);
});

process.on("SIGTERM", (signal) => {
  void shutdown(signal);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason });
  void shutdown("SIGTERM");
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error });
  void shutdown("SIGTERM");
});


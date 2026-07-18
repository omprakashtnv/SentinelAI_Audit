import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";

import { environment } from "./config/environment";
import { errorMiddleware } from "./middleware/error.middleware";
import { notFoundMiddleware } from "./middleware/not-found.middleware";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import { apiRouter } from "./routes";
import { logger } from "./shared/logger/logger";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(
    cors({
      origin: environment.corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    }),
  );
  app.use(
    compression({
      filter: (request, response) => {
        if (request.headers.accept?.includes("text/event-stream")) {
          return false;
        }

        return compression.filter(request, response);
      },
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: environment.requestBodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: environment.requestBodyLimit }));
  app.use(
    rateLimit({
      windowMs: environment.rateLimit.windowMs,
      limit: environment.rateLimit.max,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
        },
      },
    }),
  );
  app.use(
    morgan(environment.isProduction ? "combined" : "dev", {
      stream: {
        write: (message) => logger.http(message.trim()),
      },
    }),
  );

  app.use("/api", apiRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

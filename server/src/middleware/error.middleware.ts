import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { environment } from "../config/environment";
import { ApiError } from "../shared/errors/api-error";
import { sendError } from "../shared/http/api-response";
import { logger } from "../shared/logger/logger";

const EXPECTED_INFO_ERROR_CODES = new Set(["REPOSITORY_SOURCE_NOT_FOUND"]);

export const errorMiddleware: ErrorRequestHandler = (error, request, response, _next) => {
  const requestId = request.id;

  if (error instanceof ZodError) {
    sendError(response, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Request validation failed.",
      details: error.flatten(),
      requestId,
    });
    return;
  }

  if (error instanceof ApiError) {
    if (error.isOperational) {
      const logLevel = EXPECTED_INFO_ERROR_CODES.has(error.code) ? "info" : "warn";

      logger[logLevel](error.message, {
        code: error.code,
        statusCode: error.statusCode,
        requestId,
      });
    } else {
      logger.error(error.message, {
        code: error.code,
        statusCode: error.statusCode,
        requestId,
        stack: error.stack,
      });
    }

    sendError(response, {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details,
      requestId,
    });
    return;
  }

  logger.error("Unhandled application error", {
    requestId,
    error,
  });

  sendError(response, {
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred.",
    details: environment.isProduction ? undefined : normalizeUnknownError(error),
    requestId,
  });
};

function normalizeUnknownError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    value: error,
  };
}

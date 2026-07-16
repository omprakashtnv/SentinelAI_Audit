import type { RequestHandler } from "express";

import { ApiError } from "../shared/errors/api-error";

export const notFoundMiddleware: RequestHandler = (request, _response, next) => {
  next(
    new ApiError({
      statusCode: 404,
      code: "ROUTE_NOT_FOUND",
      message: `Route ${request.method} ${request.originalUrl} was not found.`,
    }),
  );
};


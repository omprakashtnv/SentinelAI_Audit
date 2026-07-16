import type { RequestHandler } from "express";

import { ApiError } from "../../shared/errors/api-error";
import { verifyAccessToken } from "../../shared/security/jwt";

export const requireAuth: RequestHandler = (request, _response, next) => {
  const authorizationHeader = request.header("Authorization");
  const token = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : undefined;

  if (!token) {
    next(
      new ApiError({
        statusCode: 401,
        code: "MISSING_ACCESS_TOKEN",
        message: "Bearer access token is required.",
      }),
    );
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    request.user = {
      id: payload.sub,
      email: payload.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};


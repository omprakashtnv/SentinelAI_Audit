import type { Request, RequestHandler } from "express";

import { environment } from "../../config/environment";
import { ApiError } from "../../shared/errors/api-error";
import { sendSuccess } from "../../shared/http/api-response";
import type { AuthResponse, RequestMetadata } from "./auth.types";
import { clearRefreshTokenCookie, setRefreshTokenCookie } from "./auth.cookies";
import { authService } from "./auth.service";

function getRequestMetadata(request: Request): RequestMetadata {
  return {
    ipAddress: request.ip,
    userAgent: request.get("user-agent"),
  };
}

function getRefreshTokenCookie(request: Request): string | undefined {
  return request.cookies?.[environment.refreshToken.cookieName] as string | undefined;
}

function toAuthResponse(session: { user: AuthResponse["user"]; accessToken: string; accessTokenExpiresInSeconds: number }): AuthResponse {
  return {
    user: session.user,
    accessToken: session.accessToken,
    accessTokenExpiresInSeconds: session.accessTokenExpiresInSeconds,
  };
}

export const register: RequestHandler = async (request, response) => {
  const session = await authService.register(request.body, getRequestMetadata(request));

  setRefreshTokenCookie(response, session.refreshToken);
  sendSuccess(response, {
    statusCode: 201,
    message: "Registration successful.",
    data: toAuthResponse(session),
  });
};

export const login: RequestHandler = async (request, response) => {
  const session = await authService.login(request.body, getRequestMetadata(request));

  setRefreshTokenCookie(response, session.refreshToken);
  sendSuccess(response, {
    message: "Login successful.",
    data: toAuthResponse(session),
  });
};

export const refreshToken: RequestHandler = async (request, response) => {
  const session = await authService.refresh(getRefreshTokenCookie(request), getRequestMetadata(request));

  setRefreshTokenCookie(response, session.refreshToken);
  sendSuccess(response, {
    message: "Token refreshed.",
    data: toAuthResponse(session),
  });
};

export const logout: RequestHandler = async (request, response) => {
  await authService.logout(getRefreshTokenCookie(request), getRequestMetadata(request));

  clearRefreshTokenCookie(response);
  sendSuccess(response, {
    message: "Logout successful.",
    data: null,
  });
};

export const getCurrentUser: RequestHandler = async (request, response) => {
  if (!request.user) {
    throw new ApiError({
      statusCode: 401,
      code: "UNAUTHENTICATED",
      message: "Authentication is required.",
    });
  }

  const user = await authService.getCurrentUser(request.user.id);

  sendSuccess(response, {
    data: { user },
  });
};


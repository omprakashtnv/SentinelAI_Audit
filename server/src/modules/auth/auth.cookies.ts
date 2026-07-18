import type { CookieOptions, Response } from "express";

import { environment } from "../../config/environment";

const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: environment.refreshToken.cookieSecure,
  sameSite: environment.refreshToken.cookieSameSite,
  path: "/api/auth",
};

export function setRefreshTokenCookie(response: Response, refreshToken: string): void {
  response.cookie(environment.refreshToken.cookieName, refreshToken, {
    ...refreshTokenCookieOptions,
    maxAge: environment.refreshToken.ttlMs,
  });
}

export function clearRefreshTokenCookie(response: Response): void {
  response.clearCookie(environment.refreshToken.cookieName, refreshTokenCookieOptions);
}


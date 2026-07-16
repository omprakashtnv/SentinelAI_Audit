import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

import { environment } from "../../config/environment";
import { ApiError } from "../errors/api-error";

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

type VerifiedAccessTokenPayload = JwtPayload & AccessTokenPayload;

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: environment.jwt.accessTokenTtlSeconds,
    issuer: "sentinelai-api",
    audience: "sentinelai-client",
  };

  return jwt.sign(payload, environment.jwt.accessSecret, options);
}

export function verifyAccessToken(token: string): VerifiedAccessTokenPayload {
  try {
    const payload = jwt.verify(token, environment.jwt.accessSecret, {
      issuer: "sentinelai-api",
      audience: "sentinelai-client",
    });

    if (!isAccessTokenPayload(payload)) {
      throw new ApiError({
        statusCode: 401,
        code: "INVALID_ACCESS_TOKEN",
        message: "Access token is invalid.",
      });
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError({
      statusCode: 401,
      code: "INVALID_ACCESS_TOKEN",
      message: "Access token is invalid or expired.",
    });
  }
}

function isAccessTokenPayload(payload: string | JwtPayload): payload is VerifiedAccessTokenPayload {
  return typeof payload !== "string" && typeof payload.sub === "string" && typeof payload.email === "string";
}


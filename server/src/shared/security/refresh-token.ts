import { createHash, randomBytes, randomUUID } from "node:crypto";

export function createRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(refreshToken: string): string {
  return createHash("sha256").update(refreshToken).digest("hex");
}

export function createRefreshTokenFamilyId(): string {
  return randomUUID();
}


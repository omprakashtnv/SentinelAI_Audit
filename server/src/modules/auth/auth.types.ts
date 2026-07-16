import type { PublicUser } from "../users/user.types";

export type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

export type AuthSession = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
};

export type AuthResponse = Omit<AuthSession, "refreshToken">;


import { Prisma } from "@prisma/client";

import { environment } from "../../config/environment";
import { prisma } from "../../db";
import { ApiError } from "../../shared/errors/api-error";
import { signAccessToken } from "../../shared/security/jwt";
import { hashPassword, verifyPassword } from "../../shared/security/password";
import {
  createRefreshToken,
  createRefreshTokenFamilyId,
  hashRefreshToken,
} from "../../shared/security/refresh-token";
import { UserRepository, userRepository } from "../users/user.repository";
import { toPublicUser } from "../users/user.types";
import { AuthRepository, authRepository } from "./auth.repository";
import type { LoginInput, RegisterInput } from "./auth.schemas";
import type { AuthSession, RequestMetadata } from "./auth.types";

type DatabaseClient = Prisma.TransactionClient | typeof prisma;

export class AuthService {
  public constructor(
    private readonly users: UserRepository,
    private readonly tokens: AuthRepository,
  ) {}

  public async register(input: RegisterInput, metadata: RequestMetadata): Promise<AuthSession> {
    const existingUser = await this.users.findByEmail(input.email);

    if (existingUser) {
      throw new ApiError({
        statusCode: 409,
        code: "EMAIL_ALREADY_REGISTERED",
        message: "A user with this email already exists.",
      });
    }

    const passwordHash = await hashPassword(input.password);

    try {
      return await prisma.$transaction(async (tx) => {
        const user = await this.users.create(
          {
            email: input.email,
            name: input.name,
            passwordHash,
          },
          tx,
        );

        return this.issueSession(user.id, user.email, metadata, tx);
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ApiError({
          statusCode: 409,
          code: "EMAIL_ALREADY_REGISTERED",
          message: "A user with this email already exists.",
        });
      }

      throw error;
    }
  }

  public async login(input: LoginInput, metadata: RequestMetadata): Promise<AuthSession> {
    const user = await this.users.findByEmail(input.email);

    if (!user) {
      throw this.invalidCredentialsError();
    }

    const isPasswordValid = await verifyPassword(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw this.invalidCredentialsError();
    }

    return this.issueSession(user.id, user.email, metadata);
  }

  public async refresh(refreshToken: string | undefined, metadata: RequestMetadata): Promise<AuthSession> {
    if (!refreshToken) {
      throw this.missingRefreshTokenError();
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await this.tokens.findRefreshTokenByHash(tokenHash);

    if (!storedToken) {
      throw this.invalidRefreshTokenError();
    }

    const user = await this.users.findById(storedToken.userId);

    if (!user) {
      throw this.invalidRefreshTokenError();
    }

    if (storedToken.revokedAt) {
      await this.tokens.revokeRefreshTokenFamily({
        userId: storedToken.userId,
        familyId: storedToken.familyId,
        revokedByIp: metadata.ipAddress,
      });

      throw new ApiError({
        statusCode: 401,
        code: "REFRESH_TOKEN_REPLAY_DETECTED",
        message: "Refresh token reuse was detected. Please sign in again.",
      });
    }

    if (storedToken.expiresAt.getTime() <= Date.now()) {
      await this.tokens.revokeRefreshToken(storedToken.id, {
        revokedByIp: metadata.ipAddress,
      });
      throw this.invalidRefreshTokenError();
    }

    return prisma.$transaction(async (tx) => {
      const wasRevoked = await this.tokens.revokeRefreshTokenIfActive(
        storedToken.id,
        {
          revokedByIp: metadata.ipAddress,
        },
        tx,
      );

      if (!wasRevoked) {
        await this.tokens.revokeRefreshTokenFamily(
          {
            userId: storedToken.userId,
            familyId: storedToken.familyId,
            revokedByIp: metadata.ipAddress,
          },
          tx,
        );

        throw new ApiError({
          statusCode: 401,
          code: "REFRESH_TOKEN_REPLAY_DETECTED",
          message: "Refresh token reuse was detected. Please sign in again.",
        });
      }

      const nextRefreshToken = createRefreshToken();
      const nextStoredToken = await this.tokens.createRefreshToken(
        {
          tokenHash: hashRefreshToken(nextRefreshToken),
          userId: user.id,
          familyId: storedToken.familyId,
          expiresAt: this.getRefreshTokenExpiry(),
          createdByIp: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
        tx,
      );

      await this.tokens.setRefreshTokenReplacement(storedToken.id, nextStoredToken.id, tx);

      return {
        user: toPublicUser(user),
        accessToken: signAccessToken({ sub: user.id, email: user.email }),
        refreshToken: nextRefreshToken,
        accessTokenExpiresInSeconds: environment.jwt.accessTokenTtlSeconds,
      };
    });
  }

  public async logout(refreshToken: string | undefined, metadata: RequestMetadata): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const storedToken = await this.tokens.findRefreshTokenByHash(hashRefreshToken(refreshToken));

    if (!storedToken || storedToken.revokedAt) {
      return;
    }

    await this.tokens.revokeRefreshToken(storedToken.id, {
      revokedByIp: metadata.ipAddress,
    });
  }

  public async getCurrentUser(userId: string) {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new ApiError({
        statusCode: 401,
        code: "AUTHENTICATED_USER_NOT_FOUND",
        message: "Authenticated user was not found.",
      });
    }

    return toPublicUser(user);
  }

  private async issueSession(
    userId: string,
    email: string,
    metadata: RequestMetadata,
    tx: DatabaseClient = prisma,
  ): Promise<AuthSession> {
    const user = await this.users.findById(userId, tx);

    if (!user) {
      throw new ApiError({
        statusCode: 500,
        code: "SESSION_USER_NOT_FOUND",
        message: "Unable to create a session for this user.",
        isOperational: false,
      });
    }

    const refreshToken = createRefreshToken();

    await this.tokens.createRefreshToken(
      {
        tokenHash: hashRefreshToken(refreshToken),
        userId,
        familyId: createRefreshTokenFamilyId(),
        expiresAt: this.getRefreshTokenExpiry(),
        createdByIp: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
      tx,
    );

    return {
      user: toPublicUser(user),
      accessToken: signAccessToken({ sub: userId, email }),
      refreshToken,
      accessTokenExpiresInSeconds: environment.jwt.accessTokenTtlSeconds,
    };
  }

  private getRefreshTokenExpiry(): Date {
    return new Date(Date.now() + environment.refreshToken.ttlMs);
  }

  private invalidCredentialsError(): ApiError {
    return new ApiError({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "Email or password is incorrect.",
    });
  }

  private invalidRefreshTokenError(): ApiError {
    return new ApiError({
      statusCode: 401,
      code: "INVALID_REFRESH_TOKEN",
      message: "Refresh token is invalid or expired.",
    });
  }

  private missingRefreshTokenError(): ApiError {
    return new ApiError({
      statusCode: 401,
      code: "MISSING_REFRESH_TOKEN",
      message: "Refresh token cookie is required.",
    });
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}

export const authService = new AuthService(userRepository, authRepository);

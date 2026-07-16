import type { Prisma, RefreshToken } from "@prisma/client";

import { prisma } from "../../db";

type DatabaseClient = Prisma.TransactionClient | typeof prisma;

export class AuthRepository {
  public createRefreshToken(
    data: {
      tokenHash: string;
      userId: string;
      familyId: string;
      expiresAt: Date;
      createdByIp?: string;
      userAgent?: string;
    },
    db: DatabaseClient = prisma,
  ): Promise<RefreshToken> {
    return db.refreshToken.create({
      data,
    });
  }

  public findRefreshTokenByHash(tokenHash: string, db: DatabaseClient = prisma): Promise<RefreshToken | null> {
    return db.refreshToken.findUnique({
      where: { tokenHash },
    });
  }

  public revokeRefreshToken(
    id: string,
    data: {
      replacedByTokenId?: string;
      revokedByIp?: string;
    },
    db: DatabaseClient = prisma,
  ): Promise<RefreshToken> {
    return db.refreshToken.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        replacedByTokenId: data.replacedByTokenId,
        revokedByIp: data.revokedByIp,
      },
    });
  }

  public async revokeRefreshTokenIfActive(
    id: string,
    data: {
      revokedByIp?: string;
    },
    db: DatabaseClient = prisma,
  ): Promise<boolean> {
    const result = await db.refreshToken.updateMany({
      where: {
        id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedByIp: data.revokedByIp,
      },
    });

    return result.count === 1;
  }

  public setRefreshTokenReplacement(
    id: string,
    replacedByTokenId: string,
    db: DatabaseClient = prisma,
  ): Promise<RefreshToken> {
    return db.refreshToken.update({
      where: { id },
      data: { replacedByTokenId },
    });
  }

  public async revokeRefreshTokenFamily(
    data: {
      userId: string;
      familyId: string;
      revokedByIp?: string;
    },
    db: DatabaseClient = prisma,
  ): Promise<void> {
    await db.refreshToken.updateMany({
      where: {
        userId: data.userId,
        familyId: data.familyId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedByIp: data.revokedByIp,
      },
    });
  }
}

export const authRepository = new AuthRepository();

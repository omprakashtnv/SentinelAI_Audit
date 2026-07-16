import type { Prisma, User } from "@prisma/client";

import { prisma } from "../../db";

type DatabaseClient = Prisma.TransactionClient | typeof prisma;

export class UserRepository {
  public findById(id: string, db: DatabaseClient = prisma): Promise<User | null> {
    return db.user.findUnique({
      where: { id },
    });
  }

  public findByEmail(email: string, db: DatabaseClient = prisma): Promise<User | null> {
    return db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  public create(
    data: {
      email: string;
      name?: string;
      passwordHash: string;
    },
    db: DatabaseClient = prisma,
  ): Promise<User> {
    return db.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash: data.passwordHash,
      },
    });
  }
}

export const userRepository = new UserRepository();


import type { User } from "@prisma/client";

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}


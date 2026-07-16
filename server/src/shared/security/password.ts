import bcrypt from "bcrypt";

import { environment } from "../../config/environment";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, environment.security.bcryptSaltRounds);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}


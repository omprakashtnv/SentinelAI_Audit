export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  accessTokenExpiresInSeconds: number;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  name?: string;
  password: string;
};


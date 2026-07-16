import { apiRequest, publicApiRequest, refreshAuthSession } from "@/services/api/api-client";
import type { AuthSession, AuthUser, LoginRequest, RegisterRequest } from "@/types/auth";

type CurrentUserResponse = {
  user: AuthUser;
};

export function registerUser(input: RegisterRequest): Promise<AuthSession> {
  return publicApiRequest<AuthSession>({
    path: "/auth/register",
    method: "POST",
    data: input,
  });
}

export function loginUser(input: LoginRequest): Promise<AuthSession> {
  return publicApiRequest<AuthSession>({
    path: "/auth/login",
    method: "POST",
    data: input,
  });
}

export function refreshUserSession(): Promise<AuthSession> {
  return refreshAuthSession();
}

export async function logoutUser(): Promise<void> {
  await publicApiRequest<null>({
    path: "/auth/logout",
    method: "POST",
  });
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiRequest<CurrentUserResponse>({
    path: "/auth/me",
  });

  return response.user;
}

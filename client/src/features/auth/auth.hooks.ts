import { useMutation, useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/use-auth";
import { loginUser, getCurrentUser, registerUser } from "@/services/api/auth";
import type { LoginFormValues, RegisterFormValues } from "./auth.schemas";

export function useLoginMutation() {
  const { setSession } = useAuth();

  return useMutation({
    mutationFn: (values: LoginFormValues) => loginUser(values),
    onSuccess: (session) => {
      setSession(session);
    },
  });
}

export function useRegisterMutation() {
  const { setSession } = useAuth();

  return useMutation({
    mutationFn: (values: RegisterFormValues) =>
      registerUser({
        email: values.email,
        name: values.name,
        password: values.password,
      }),
    onSuccess: (session) => {
      setSession(session);
    },
  });
}

export function useCurrentUserQuery() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });
}

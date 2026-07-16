import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { FormError } from "@/components/feedback/form-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginMutation } from "@/features/auth/auth.hooks";
import { loginFormSchema, type LoginFormValues } from "@/features/auth/auth.schemas";
import { ApiClientError } from "@/services/api/api-client";

type LocationState = {
  from?: {
    pathname?: string;
  };
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLoginMutation();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const locationState = location.state as LocationState | null;
  const redirectTo = locationState?.from?.pathname ?? "/dashboard";
  const errorMessage =
    loginMutation.error instanceof ApiClientError
      ? loginMutation.error.message
      : loginMutation.error
        ? "Unable to sign in. Please try again."
        : undefined;

  async function onSubmit(values: LoginFormValues): Promise<void> {
    await loginMutation.mutateAsync(values);
    navigate(redirectTo, { replace: true });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to continue to your security audit workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormError message={errorMessage} />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            <FieldError message={form.formState.errors.email?.message} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
            <FieldError message={form.formState.errors.password?.message} />
          </div>

          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}


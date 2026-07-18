import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { FormError } from "@/components/feedback/form-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterMutation } from "@/features/auth/auth.hooks";
import { registerFormSchema, type RegisterFormValues } from "@/features/auth/auth.schemas";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/services/api/api-client";

export function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const registerMutation = useRegisterMutation();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const errorMessage =
    registerMutation.error instanceof ApiClientError
      ? registerMutation.error.message
      : registerMutation.error
        ? "Unable to create your account. Please try again."
        : undefined;

  async function onSubmit(values: RegisterFormValues): Promise<void> {
    await registerMutation.mutateAsync(values);
    navigate("/dashboard", { replace: true });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>Start with secure access to your SentinelAI workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormError message={errorMessage} />

          <FormField label="Name" error={form.formState.errors.name?.message}>
            <Input id="name" autoComplete="name" {...form.register("name")} />
          </FormField>

          <FormField label="Email" error={form.formState.errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          </FormField>

          <FormField label="Password" error={form.formState.errors.password?.message}>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              isVisible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              {...form.register("password")}
            />
          </FormField>

          <FormField label="Confirm password" error={form.formState.errors.confirmPassword?.message}>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              isVisible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((value) => !value)}
              {...form.register("confirmPassword")}
            />
          </FormField>

          <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

type PasswordInputProps = React.ComponentProps<typeof Input> & {
  isVisible: boolean;
  onToggle: () => void;
};

function PasswordInput({ isVisible, onToggle, className, ...props }: PasswordInputProps) {
  return (
    <div className="relative">
      <Input {...props} type={isVisible ? "text" : "password"} className={cn("pr-10", className)} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={isVisible ? "Hide password" : "Show password"}
        title={isVisible ? "Hide password" : "Show password"}
        onClick={onToggle}
      >
        {isVisible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </Button>
    </div>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={label === "Confirm password" ? "confirmPassword" : label.toLowerCase()}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormValues,
} from "@/features/auth/auth.schemas";

export function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(values: ForgotPasswordFormValues): void {
    setSubmittedEmail(values.email);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Reset password</CardTitle>
        <CardDescription>Password reset delivery is reserved for the next backend milestone.</CardDescription>
      </CardHeader>
      <CardContent>
        {submittedEmail ? (
          <div className="rounded-lg border border-border bg-muted/30 p-5 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-background">
              <MailCheck className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm font-medium">Placeholder request captured</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Password reset email support is not implemented yet. Requested address: {submittedEmail}
            </p>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" variant="outline">
              Continue
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}


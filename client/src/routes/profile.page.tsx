import { Calendar, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUserQuery } from "@/features/auth/auth.hooks";

export function ProfilePage() {
  const { user, logout } = useAuth();
  const currentUserQuery = useCurrentUserQuery();
  const displayUser = currentUserQuery.data ?? user;

  if (!displayUser) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Profile</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Manage the signed-in user context for this SentinelAI workspace.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Personal details returned by the authentication API.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ProfileItem icon={ShieldCheck} label="Name" value={displayUser.name ?? "Not provided"} />
            <ProfileItem icon={Mail} label="Email" value={displayUser.email} />
            <ProfileItem icon={Calendar} label="Created" value={new Date(displayUser.createdAt).toLocaleDateString()} />
            <ProfileItem icon={Calendar} label="Updated" value={new Date(displayUser.updatedAt).toLocaleDateString()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>Access tokens are short-lived; refresh tokens stay HTTP-only.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="destructive" className="w-full" onClick={() => void logout()}>
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <p className="mt-2 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}


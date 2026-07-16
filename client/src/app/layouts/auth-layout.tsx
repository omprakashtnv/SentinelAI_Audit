import { ShieldCheck } from "lucide-react";
import { Outlet } from "react-router-dom";

import { ThemeToggle } from "@/app/theme/theme-toggle";

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-5">SentinelAI</p>
            <p className="text-xs text-muted-foreground">Security audit console</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="grid min-h-[calc(100vh-4rem)] px-4 py-8 lg:grid-cols-[1fr_560px] lg:px-8">
        <section className="hidden items-center justify-center lg:flex">
          <div className="max-w-xl">
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">Enterprise-ready foundation</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-normal">
                Secure access for AI-powered repository audits.
              </h1>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                SentinelAI keeps authentication focused, minimal, and ready for the audit workflows that follow.
              </p>
              <div className="mt-6 grid gap-3 text-sm">
                {["HTTP-only refresh session", "Short-lived access tokens", "Protected dashboard routes"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
                    <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-md items-center justify-center">
          <Outlet />
        </section>
      </main>
    </div>
  );
}


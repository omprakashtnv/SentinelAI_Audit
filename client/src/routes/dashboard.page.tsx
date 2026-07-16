import { motion } from "framer-motion";
import { Activity, FileText, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useHealthCheck } from "@/hooks/use-health-check";

const metrics = [
  { label: "Audits queued", value: "0", icon: Activity, tone: "text-sky-600 dark:text-sky-400" },
  { label: "Open findings", value: "0", icon: TriangleAlert, tone: "text-amber-600 dark:text-amber-400" },
  { label: "Reports ready", value: "0", icon: FileText, tone: "text-emerald-600 dark:text-emerald-400" },
] as const;

export function DashboardPage() {
  const healthQuery = useHealthCheck();
  const apiStatus = healthQuery.isSuccess ? "Online" : healthQuery.isError ? "Unavailable" : "Checking";

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="outline">Workspace foundation</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal text-foreground">Security audit dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            A production-ready interface shell for repository intake, vulnerability review, secure fixes, and audit reporting.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
          <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
          <span className="text-muted-foreground">API</span>
          <span className="font-medium text-card-foreground">{apiStatus}</span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>{metric.label}</CardTitle>
                <metric.icon className={`size-4 ${metric.tone}`} aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-normal">{metric.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">Ready for future audit data</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader>
            <CardTitle>Audit workflow</CardTitle>
            <CardDescription>Frontend regions are prepared for a secure scan lifecycle.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            {["Import", "Analyze", "Remediate", "Report"].map((step, index) => (
              <div key={step} className="rounded-md border border-border bg-muted/20 p-4">
                <div className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">{step}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Reserved module surface</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Readiness</CardTitle>
            <CardDescription>Core client systems are wired.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Routing", "Theme", "API layer", "Query cache"].map((item) => (
              <div key={item}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item}</span>
                  <Badge variant="success">Ready</Badge>
                </div>
                <Separator className="mt-3" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

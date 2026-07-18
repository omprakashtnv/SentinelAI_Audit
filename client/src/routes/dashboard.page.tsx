import { motion } from "framer-motion";
import { FolderKanban, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectErrorState } from "@/features/projects/components/project-error-state";
import { useProjectDashboardStatisticsQuery } from "@/features/projects/project.hooks";

export function DashboardPage() {
  const statisticsQuery = useProjectDashboardStatisticsQuery();
  const statistics = statisticsQuery.data;

  if (statisticsQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (statisticsQuery.isError) {
    return <ProjectErrorState onRetry={() => void statisticsQuery.refetch()} />;
  }

  const metrics = [
    {
      label: "Active projects",
      value: statistics?.activeProjects ?? 0,
      icon: FolderKanban,
      tone: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "Created this week",
      value: statistics?.createdLast7Days ?? 0,
      icon: Plus,
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Deleted projects",
      value: statistics?.deletedProjects ?? 0,
      icon: Trash2,
      tone: "text-amber-600 dark:text-amber-400",
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="outline">Project workspace</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal text-foreground">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Track repository audit workspaces, recent project activity, and cleanup state.
          </p>
        </div>
        <Button asChild>
          <Link to="/projects/new">
            <Plus className="size-4" aria-hidden="true" />
            New project
          </Link>
        </Button>
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
                <p className="mt-1 text-xs text-muted-foreground">Scoped to your account</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Recently updated</CardTitle>
              <CardDescription>Your latest active project workspaces.</CardDescription>
            </div>
            <Button asChild type="button" variant="outline" size="sm">
              <Link to="/projects">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {statistics?.recentlyUpdated.length ? (
              <div className="divide-y divide-border rounded-lg border border-border">
                {statistics.recentlyUpdated.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground" title={project.name}>
                        {project.name}
                      </p>
                      <p
                        className="mt-1 truncate text-xs text-muted-foreground"
                        title={project.repositoryUrl ?? "No repository linked"}
                      >
                        {project.repositoryUrl ?? "No repository linked"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(project.updatedAt)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
                <p className="text-sm font-medium text-foreground">No projects yet</p>
                <p className="mt-2 text-sm text-muted-foreground">Create your first project to start organizing audits.</p>
                <Button asChild className="mt-5">
                  <Link to="/projects/new">Create project</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace health</CardTitle>
            <CardDescription>Project module readiness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Total projects</span>
              <span className="font-medium">{statistics?.totalProjects ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Created last 30 days</span>
              <span className="font-medium">{statistics?.createdLast30Days ?? 0}</span>
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={() => void statisticsQuery.refetch()}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Refresh statistics
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

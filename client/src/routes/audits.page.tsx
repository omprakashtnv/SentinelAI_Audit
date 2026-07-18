import { ArrowRight, FolderKanban, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectsQuery } from "@/features/projects/project.hooks";

export function AuditsPage() {
  const projectsQuery = useProjectsQuery({
    page: 1,
    limit: 10,
  });

  if (projectsQuery.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (projectsQuery.isError) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Unable to load audits"
        description="Refresh the page or check that the server is running."
        action={
          <Button type="button" variant="outline" onClick={() => void projectsQuery.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  const projects = projectsQuery.data?.projects ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Audits</h1>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Start rule-based repository scans from a project workspace and review findings as soon as the scan completes.
        </p>
      </div>

      {projects.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Project audit workspaces</CardTitle>
            <CardDescription>Select a project to run or review a security audit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="size-4 text-muted-foreground" aria-hidden="true" />
                    <p className="truncate text-sm font-semibold text-foreground">{project.name}</p>
                    <Badge variant="success">Active</Badge>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {project.description ?? "No description provided."}
                  </p>
                </div>
                <Button asChild type="button" variant="outline" className="w-full sm:w-auto">
                  <Link to={`/projects/${project.id}`}>
                    Open audit
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="No projects yet"
          description="Create a project, attach a repository, then run a security audit from the project details page."
          action={
            <Button asChild type="button">
              <Link to="/projects/new">Create project</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}

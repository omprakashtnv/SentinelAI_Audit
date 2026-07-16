import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProjectDeleteDialog } from "@/features/projects/components/project-delete-dialog";
import { ProjectErrorState } from "@/features/projects/components/project-error-state";
import { ProjectListSkeleton } from "@/features/projects/components/project-list-skeleton";
import { ProjectPagination } from "@/features/projects/components/project-pagination";
import { ProjectTable } from "@/features/projects/components/project-table";
import { useDeleteProjectMutation, useProjectsQuery } from "@/features/projects/project.hooks";
import { ApiClientError } from "@/services/api/api-client";
import type { Project } from "@/types/project";

export function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const [projectPendingDelete, setProjectPendingDelete] = useState<Project | null>(null);
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "10");
  const search = searchParams.get("search") ?? "";
  const filters = useMemo(
    () => ({
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
      search: search.trim() || undefined,
    }),
    [limit, page, search],
  );

  const projectsQuery = useProjectsQuery(filters);
  const deleteMutation = useDeleteProjectMutation();

  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  function updateParams(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams);

    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    setSearchParams(params);
  }

  async function handleDelete() {
    if (!projectPendingDelete) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(projectPendingDelete.id);
      setProjectPendingDelete(null);
      toast.success("Project deleted.");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Unable to delete project.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Projects</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Manage repository workspaces before audits, fixes, and reports are attached.
          </p>
        </div>
        <Button asChild>
          <Link to="/projects/new">
            <Plus className="size-4" aria-hidden="true" />
            Create project
          </Link>
        </Button>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Project list</CardTitle>
          <CardDescription>Search and paginate your active projects.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search projects"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    updateParams({ search: searchValue.trim(), page: 1 });
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={filters.limit}
                onChange={(event) => updateParams({ limit: event.target.value, page: 1 })}
                aria-label="Projects per page"
              >
                {[10, 20, 50].map((value) => (
                  <option key={value} value={value}>
                    {value} per page
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={() => updateParams({ search: searchValue.trim(), page: 1 })}>
                Search
              </Button>
              <Button type="button" variant="ghost" onClick={() => updateParams({ search: undefined, page: 1 })}>
                Clear
              </Button>
            </div>
          </div>

          {projectsQuery.isLoading ? <ProjectListSkeleton /> : null}

          {projectsQuery.isError ? (
            <ProjectErrorState onRetry={() => void projectsQuery.refetch()} />
          ) : null}

          {projectsQuery.isSuccess && projectsQuery.data.projects.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No projects found"
              description="Create a project or adjust your search to see active workspaces."
              action={
                <Button asChild>
                  <Link to="/projects/new">Create project</Link>
                </Button>
              }
            />
          ) : null}

          {projectsQuery.isSuccess && projectsQuery.data.projects.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <ProjectTable
                projects={projectsQuery.data.projects}
                onDelete={(project) => setProjectPendingDelete(project)}
                deletingProjectId={deleteMutation.variables}
              />
              <ProjectPagination
                meta={projectsQuery.data.meta}
                onPageChange={(nextPage) => updateParams({ page: nextPage })}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
      <ProjectDeleteDialog
        open={Boolean(projectPendingDelete)}
        projectName={projectPendingDelete?.name}
        isDeleting={deleteMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setProjectPendingDelete(null);
          }
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

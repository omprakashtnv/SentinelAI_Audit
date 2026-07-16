import { ArrowLeft, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectDeleteDialog } from "@/features/projects/components/project-delete-dialog";
import { ProjectErrorState } from "@/features/projects/components/project-error-state";
import { useDeleteProjectMutation, useProjectQuery } from "@/features/projects/project.hooks";
import { ApiClientError } from "@/services/api/api-client";

export function ProjectDetailsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const projectQuery = useProjectQuery(projectId);
  const deleteMutation = useDeleteProjectMutation();
  const project = projectQuery.data;

  async function handleDelete() {
    if (!project) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(project.id);
      setIsDeleteDialogOpen(false);
      toast.success("Project deleted.");
      navigate("/projects");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Unable to delete project.");
    }
  }

  if (projectQuery.isLoading) {
    return <ProjectDetailsSkeleton />;
  }

  if (projectQuery.isError || !project) {
    return <ProjectErrorState title="Project not found" message="This project may have been deleted or is unavailable." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Button asChild type="button" variant="ghost" className="mb-4 w-fit">
            <Link to="/projects">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Projects
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-normal text-foreground">{project.name}</h1>
            <Badge variant="success">Active</Badge>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {project.description ?? "No description provided."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild type="button" variant="outline">
            <Link to={`/projects/${project.id}/edit`}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </Link>
          </Button>
          <Button type="button" variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={deleteMutation.isPending}>
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Project context</CardTitle>
            <CardDescription>Core details for this repository workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="Project ID" value={project.id} />
            <DetailRow label="Created" value={formatDate(project.createdAt)} />
            <DetailRow label="Last updated" value={formatDate(project.updatedAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repository</CardTitle>
            <CardDescription>Source location attached to this project.</CardDescription>
          </CardHeader>
          <CardContent>
            {project.repositoryUrl ? (
              <Button asChild type="button" variant="outline" className="w-full">
                <a href={project.repositoryUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" aria-hidden="true" />
                  Open repository
                </a>
              </Button>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
                <p className="text-sm font-medium text-foreground">No repository linked</p>
                <p className="mt-2 text-sm text-muted-foreground">Add one from the edit page.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <ProjectDeleteDialog
        open={isDeleteDialogOpen}
        projectName={project.name}
        isDeleting={deleteMutation.isPending}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="break-all text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function ProjectDetailsSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
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

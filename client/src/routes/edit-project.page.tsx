import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectErrorState } from "@/features/projects/components/project-error-state";
import { ProjectForm } from "@/features/projects/components/project-form";
import { useProjectQuery, useUpdateProjectMutation } from "@/features/projects/project.hooks";
import { normalizeProjectUpdateValues, type ProjectFormValues } from "@/features/projects/project.schemas";
import { ApiClientError } from "@/services/api/api-client";

export function EditProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const projectQuery = useProjectQuery(projectId);
  const updateMutation = useUpdateProjectMutation(projectId ?? "");
  const project = projectQuery.data;
  const errorMessage =
    updateMutation.error instanceof ApiClientError
      ? updateMutation.error.message
      : updateMutation.error
        ? "Unable to update project."
        : undefined;

  async function handleSubmit(values: ProjectFormValues) {
    if (!projectId) {
      return;
    }

    const updatedProject = await updateMutation.mutateAsync(normalizeProjectUpdateValues(values));
    toast.success("Project updated.");
    navigate(`/projects/${updatedProject.id}`);
  }

  if (projectQuery.isLoading) {
    return <Skeleton className="mx-auto h-96 w-full max-w-3xl" />;
  }

  if (projectQuery.isError || !project) {
    return <ProjectErrorState title="Project not found" message="This project may have been deleted or is unavailable." />;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Button asChild type="button" variant="ghost" className="w-fit">
        <Link to={`/projects/${project.id}`}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Project details
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Edit project</CardTitle>
          <CardDescription>Update workspace metadata. Ownership remains scoped to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm
            defaultValues={{
              name: project.name,
              description: project.description ?? "",
              repositoryUrl: project.repositoryUrl ?? "",
            }}
            submitLabel="Save changes"
            isSubmitting={updateMutation.isPending}
            errorMessage={errorMessage}
            showRepositoryUrl={false}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}

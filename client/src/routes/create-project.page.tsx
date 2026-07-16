import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectForm } from "@/features/projects/components/project-form";
import { normalizeProjectFormValues, type ProjectFormValues } from "@/features/projects/project.schemas";
import { useCreateProjectMutation } from "@/features/projects/project.hooks";
import { ApiClientError } from "@/services/api/api-client";

export function CreateProjectPage() {
  const navigate = useNavigate();
  const createMutation = useCreateProjectMutation();
  const errorMessage =
    createMutation.error instanceof ApiClientError
      ? createMutation.error.message
      : createMutation.error
        ? "Unable to create project."
        : undefined;

  async function handleSubmit(values: ProjectFormValues) {
    const project = await createMutation.mutateAsync(normalizeProjectFormValues(values));
    toast.success("Project created.");
    navigate(`/projects/${project.id}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Button asChild type="button" variant="ghost" className="w-fit">
        <Link to="/projects">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Projects
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Create project</CardTitle>
          <CardDescription>Add a repository workspace that can later receive scans and reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm
            submitLabel="Create project"
            isSubmitting={createMutation.isPending}
            errorMessage={errorMessage}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}


import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectErrorState } from "@/features/projects/components/project-error-state";
import { useProjectQuery } from "@/features/projects/project.hooks";
import { UploadRepositoryPanel } from "@/features/repository-imports/components/upload-repository-panel";

export function UploadRepositoryPage() {
  const { projectId } = useParams();
  const projectQuery = useProjectQuery(projectId);

  if (!projectId) {
    return null;
  }

  if (projectQuery.isLoading) {
    return <UploadRepositoryPageSkeleton />;
  }

  if (projectQuery.isError || !projectQuery.data) {
    return <ProjectErrorState title="Project not found" message="This project may be unavailable." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild type="button" variant="ghost" className="mb-4 w-fit">
          <Link to={`/projects/${projectId}`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Project
          </Link>
        </Button>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{projectQuery.data.name}</p>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Upload Repository</h1>
        </div>
      </div>

      <UploadRepositoryPanel projectId={projectId} />
    </div>
  );
}

function UploadRepositoryPageSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[32rem] w-full" />
        <Skeleton className="h-[32rem] w-full" />
      </div>
    </div>
  );
}

import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectErrorState } from "@/features/projects/components/project-error-state";
import { useProjectQuery } from "@/features/projects/project.hooks";
import { RepositorySecurityView } from "@/features/findings/components/repository-security-view";

export function RepositorySecurityPage() {
  const { projectId } = useParams();
  const projectQuery = useProjectQuery(projectId);

  if (!projectId) {
    return <EmptyState icon={ShieldAlert} title="Project unavailable" description="The security route is incomplete." />;
  }

  if (projectQuery.isLoading) {
    return <RepositorySecurityPageSkeleton />;
  }

  if (projectQuery.isError || !projectQuery.data) {
    return <ProjectErrorState title="Project not found" message="This project may have been deleted or is unavailable." />;
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
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Repository Security</h1>
        </div>
      </div>

      <RepositorySecurityView projectId={projectId} />
    </div>
  );
}

function RepositorySecurityPageSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-[34rem] w-full" />
    </div>
  );
}

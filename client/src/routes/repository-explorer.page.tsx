import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { RepositoryExplorer } from "@/features/repository-explorer/components/repository-explorer";

export function RepositoryExplorerPage() {
  const { projectId } = useParams();

  if (!projectId) {
    return null;
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
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Repository Explorer</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Browse parsed source files for this project.
          </p>
        </div>
      </div>

      <RepositoryExplorer projectId={projectId} />
    </div>
  );
}

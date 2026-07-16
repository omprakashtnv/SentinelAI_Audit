import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

type ProjectErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function ProjectErrorState({
  title = "Unable to load projects",
  message = "Something went wrong while loading project data.",
  onRetry,
}: ProjectErrorStateProps) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
        <TriangleAlert className="size-5" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-card-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button type="button" variant="outline" className="mt-5" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}


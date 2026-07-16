import { Loader2, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type ProjectDeleteDialogProps = {
  open: boolean;
  projectName?: string;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
};

export function ProjectDeleteDialog({
  open,
  projectName,
  isDeleting,
  onOpenChange,
  onConfirm,
}: ProjectDeleteDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/75 px-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-project-title"
        aria-describedby="delete-project-description"
        className="w-full max-w-md rounded-lg border border-border bg-card p-5 text-card-foreground shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <Trash2 className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="delete-project-title" className="text-base font-semibold">
                Delete project
              </h2>
              <p id="delete-project-description" className="mt-2 text-sm leading-6 text-muted-foreground">
                {projectName ? `${projectName} will be hidden from active project lists.` : "This project will be hidden from active project lists."}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close delete dialog"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={isDeleting} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={isDeleting} onClick={() => void onConfirm()}>
            {isDeleting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}


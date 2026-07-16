import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-md border border-border bg-background">
        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}


import { ExternalLink, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

import { HighlightText } from "@/components/data-display/highlight-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types/project";

type ProjectTableProps = {
  projects: Project[];
  searchQuery?: string;
  onDelete: (project: Project) => void;
  deletingProjectId?: string;
};

export function ProjectTable({ projects, searchQuery = "", onDelete, deletingProjectId }: ProjectTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="hidden grid-cols-[1fr_220px_160px_180px] border-b border-border bg-muted/40 px-4 py-3 text-xs font-medium uppercase text-muted-foreground lg:grid">
        <span>Project</span>
        <span>Repository</span>
        <span>Updated</span>
        <span className="text-right">Actions</span>
      </div>

      <div className="divide-y divide-border">
        {projects.map((project) => (
          <div
            key={project.id}
            className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_220px_160px_180px] lg:items-center"
          >
            <div className="min-w-0">
              <Link to={`/projects/${project.id}`} className="font-medium text-foreground hover:underline">
                <HighlightText query={searchQuery}>{project.name}</HighlightText>
              </Link>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                <HighlightText query={searchQuery} fallback="No description provided.">
                  {project.description}
                </HighlightText>
              </p>
            </div>

            <div>
              {project.repositoryUrl ? (
                <a
                  href={project.repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-2 truncate text-sm text-primary hover:underline"
                >
                  <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    <HighlightText query={searchQuery}>{project.repositoryUrl}</HighlightText>
                  </span>
                </a>
              ) : (
                <Badge variant="outline">No repository</Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">{formatDate(project.updatedAt)}</p>

            <div className="flex items-center justify-start gap-2 lg:justify-end">
              <Button asChild type="button" variant="outline" size="sm">
                <Link to={`/projects/${project.id}`}>Open</Link>
              </Button>
              <Button asChild type="button" variant="ghost" size="sm">
                <Link to={`/projects/${project.id}/edit`}>Edit</Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${project.name}`}
                disabled={deletingProjectId === project.id}
                onClick={() => onDelete(project)}
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
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

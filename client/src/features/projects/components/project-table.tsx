import { ExternalLink, FileArchive, GitBranch, MoreHorizontal } from "lucide-react";
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
              <Link to={`/projects/${project.id}`} className="font-medium text-foreground hover:underline" title={project.name}>
                <HighlightText query={searchQuery}>{project.name}</HighlightText>
              </Link>
              <p
                className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground"
                title={project.description ?? "No description provided."}
              >
                <HighlightText query={searchQuery} fallback="No description provided.">
                  {project.description}
                </HighlightText>
              </p>
            </div>

            <div className="min-w-0">
              {project.repository?.type === "github" ? (
                <a
                  href={project.repository.repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-2 truncate text-sm text-primary hover:underline"
                  title={project.repository.repositoryUrl}
                >
                  <GitBranch className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    <HighlightText query={searchQuery}>{project.repository.label}</HighlightText>
                  </span>
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                </a>
              ) : project.repository?.type === "zip" ? (
                <div
                  className="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-sm text-foreground"
                  title={`${project.repository.label} (${formatBytes(project.repository.sizeBytes)})`}
                >
                  <FileArchive className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">
                    <HighlightText query={searchQuery}>{project.repository.label}</HighlightText>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(project.repository.sizeBytes)}</span>
                </div>
              ) : project.repositoryUrl ? (
                <a
                  href={project.repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-2 truncate text-sm text-primary hover:underline"
                  title={project.repositoryUrl}
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
                title={`Delete ${project.name}`}
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

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

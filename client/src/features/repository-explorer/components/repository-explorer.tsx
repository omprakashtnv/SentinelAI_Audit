import { AlertCircle, ChevronsDownUp, ChevronsUpDown, GitBranch, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RepositoryCodeViewer } from "@/features/repository-explorer/components/repository-code-viewer";
import { RepositoryTree } from "@/features/repository-explorer/components/repository-tree";
import {
  useRepositoryExplorerQuery,
  useRepositoryFileContentQuery,
} from "@/features/repository-explorer/repository-explorer.hooks";
import type {
  RepositoryFileMetadata,
  RepositoryTreeDirectoryNode,
} from "@/types/repository";

type RepositoryExplorerProps = {
  projectId: string;
};

export function RepositoryExplorer({ projectId }: RepositoryExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<RepositoryFileMetadata | null>(null);
  const [expandedDirectories, setExpandedDirectories] = useState<Set<string>>(() => new Set([""]));
  const explorerQuery = useRepositoryExplorerQuery(projectId);
  const fileContentQuery = useRepositoryFileContentQuery({
    projectId,
    relativePath: selectedFile?.relativePath ?? null,
  });

  const allDirectoryPaths = useMemo(() => {
    if (!explorerQuery.data?.tree) {
      return [];
    }

    return collectDirectoryPaths(explorerQuery.data.tree);
  }, [explorerQuery.data?.tree]);

  useEffect(() => {
    const firstFile = explorerQuery.data?.files[0];

    if (!selectedFile && firstFile) {
      setSelectedFile(firstFile);
      setExpandedDirectories((current) => expandAncestors(current, firstFile.relativePath));
    }
  }, [explorerQuery.data?.files, selectedFile]);

  function handleToggleDirectory(relativePath: string) {
    setExpandedDirectories((current) => {
      const next = new Set(current);

      if (next.has(relativePath)) {
        next.delete(relativePath);
      } else {
        next.add(relativePath);
      }

      return next;
    });
  }

  function handleSelectFile(file: RepositoryFileMetadata) {
    setSelectedFile(file);
    setExpandedDirectories((current) => expandAncestors(current, file.relativePath));
  }

  function handleExpandAll() {
    setExpandedDirectories(new Set(allDirectoryPaths));
  }

  function handleCollapseAll() {
    setExpandedDirectories(new Set([""]));
  }

  if (explorerQuery.isLoading) {
    return <RepositoryExplorerSkeleton />;
  }

  if (explorerQuery.isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Repository unavailable"
        description="The repository tree could not be loaded."
        action={
          <Button type="button" variant="outline" onClick={() => void explorerQuery.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!explorerQuery.data || explorerQuery.data.files.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No repository files"
        description="Supported source files will appear here after the repository is parsed."
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Repository</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {explorerQuery.data.summary.parsedFiles.toLocaleString()} files ·{" "}
            {formatFileSize(explorerQuery.data.summary.totalParsedBytes)}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search files"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="icon" onClick={handleExpandAll} title="Expand all">
              <ChevronsUpDown className="size-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={handleCollapseAll} title="Collapse all">
              <ChevronsDownUp className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid min-h-[40rem] lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="max-h-[28rem] overflow-auto border-b border-border bg-muted/10 lg:max-h-[calc(100vh-14rem)] lg:border-b-0 lg:border-r">
          <RepositoryTree
            tree={explorerQuery.data.tree}
            searchQuery={searchQuery}
            selectedPath={selectedFile?.relativePath ?? null}
            expandedDirectories={expandedDirectories}
            onToggleDirectory={handleToggleDirectory}
            onSelectFile={handleSelectFile}
          />
        </aside>
        <RepositoryCodeViewer
          selectedFile={selectedFile}
          fileContent={fileContentQuery.data}
          isLoading={fileContentQuery.isLoading}
          isError={fileContentQuery.isError}
        />
      </div>
    </section>
  );
}

function RepositoryExplorerSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-44" />
        </div>
        <Skeleton className="h-9 w-72" />
      </div>
      <div className="grid min-h-[40rem] lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid content-start gap-2 border-r border-border p-3">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton key={index} className="h-7 w-full" />
          ))}
        </div>
        <div className="grid content-start gap-2 p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-9/12" />
          <Skeleton className="h-4 w-10/12" />
        </div>
      </div>
    </div>
  );
}

function collectDirectoryPaths(node: RepositoryTreeDirectoryNode): string[] {
  return [
    node.relativePath,
    ...node.children.flatMap((child) =>
      child.type === "directory" ? collectDirectoryPaths(child) : [],
    ),
  ];
}

function expandAncestors(current: Set<string>, relativePath: string) {
  const next = new Set(current);
  const segments = relativePath.split("/");

  next.add("");

  for (let index = 1; index < segments.length; index += 1) {
    next.add(segments.slice(0, index).join("/"));
  }

  return next;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

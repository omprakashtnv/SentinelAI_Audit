import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileJson2,
  FileText,
  FileType,
  Folder,
  FolderOpen,
} from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  RepositoryFileMetadata,
  RepositoryLanguage,
  RepositoryTreeDirectoryNode,
  RepositoryTreeFileNode,
} from "@/types/repository";

type RepositoryTreeProps = {
  tree: RepositoryTreeDirectoryNode;
  searchQuery: string;
  selectedPath: string | null;
  expandedDirectories: Set<string>;
  onToggleDirectory: (relativePath: string) => void;
  onSelectFile: (file: RepositoryFileMetadata) => void;
};

type VisibleDirectoryNode = RepositoryTreeDirectoryNode & {
  children: VisibleTreeNode[];
};

type VisibleTreeNode = VisibleDirectoryNode | RepositoryTreeFileNode;

export function RepositoryTree({
  tree,
  searchQuery,
  selectedPath,
  expandedDirectories,
  onToggleDirectory,
  onSelectFile,
}: RepositoryTreeProps) {
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleTree = useMemo(
    () => filterTree(tree, normalizedSearchQuery),
    [normalizedSearchQuery, tree],
  );

  if (!visibleTree || visibleTree.children.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center px-4 text-center text-sm text-muted-foreground">
        No files found.
      </div>
    );
  }

  return (
    <div className="py-2">
      {visibleTree.children.map((node) => (
        <RepositoryTreeItem
          key={node.relativePath || node.name}
          node={node}
          depth={0}
          isSearching={normalizedSearchQuery.length > 0}
          selectedPath={selectedPath}
          expandedDirectories={expandedDirectories}
          onToggleDirectory={onToggleDirectory}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}

function RepositoryTreeItem({
  node,
  depth,
  isSearching,
  selectedPath,
  expandedDirectories,
  onToggleDirectory,
  onSelectFile,
}: {
  node: VisibleTreeNode;
  depth: number;
  isSearching: boolean;
  selectedPath: string | null;
  expandedDirectories: Set<string>;
  onToggleDirectory: (relativePath: string) => void;
  onSelectFile: (file: RepositoryFileMetadata) => void;
}) {
  if (node.type === "file") {
    const FileIcon = getFileIcon(node.metadata.language);
    const isSelected = selectedPath === node.relativePath;

    return (
      <button
        type="button"
        className={cn(
          "flex h-8 w-full items-center gap-2 truncate px-3 text-left text-sm transition-colors hover:bg-accent",
          isSelected ? "bg-accent text-accent-foreground" : "text-muted-foreground",
        )}
        style={{ paddingLeft: `${depth * 14 + 12}px` }}
        onClick={() => onSelectFile(node.metadata)}
        title={node.relativePath}
      >
        <FileIcon className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  const isExpanded = isSearching || expandedDirectories.has(node.relativePath);
  const FolderIcon = isExpanded ? FolderOpen : Folder;
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        className="h-8 w-full justify-start gap-1 rounded-none px-3 text-sm font-medium text-foreground hover:bg-accent"
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => onToggleDirectory(node.relativePath)}
        title={`${isExpanded ? "Collapse" : "Expand"} ${node.relativePath || node.name}`}
      >
        <ChevronIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        <FolderIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="truncate">{node.name}</span>
      </Button>
      {isExpanded
        ? node.children.map((child) => (
            <RepositoryTreeItem
              key={child.relativePath || child.name}
              node={child}
              depth={depth + 1}
              isSearching={isSearching}
              selectedPath={selectedPath}
              expandedDirectories={expandedDirectories}
              onToggleDirectory={onToggleDirectory}
              onSelectFile={onSelectFile}
            />
          ))
        : null}
    </div>
  );
}

function filterTree(
  node: RepositoryTreeDirectoryNode,
  normalizedSearchQuery: string,
): VisibleDirectoryNode | null {
  if (!normalizedSearchQuery) {
    return node as VisibleDirectoryNode;
  }

  const children = node.children
    .map((child) => {
      if (child.type === "directory") {
        return filterTree(child, normalizedSearchQuery);
      }

      return fileMatchesSearch(child, normalizedSearchQuery) ? child : null;
    })
    .filter((child): child is VisibleTreeNode => child !== null);

  const directoryMatches = node.relativePath.toLowerCase().includes(normalizedSearchQuery);

  if (!directoryMatches && children.length === 0) {
    return null;
  }

  return {
    ...node,
    children,
  };
}

function fileMatchesSearch(file: RepositoryTreeFileNode, normalizedSearchQuery: string): boolean {
  return (
    file.name.toLowerCase().includes(normalizedSearchQuery) ||
    file.relativePath.toLowerCase().includes(normalizedSearchQuery)
  );
}

function getFileIcon(language: RepositoryLanguage) {
  if (language === "json") {
    return FileJson2;
  }

  if (language === "markdown") {
    return FileText;
  }

  if (language === "yaml") {
    return FileType;
  }

  return FileCode2;
}

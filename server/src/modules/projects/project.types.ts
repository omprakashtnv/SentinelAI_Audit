import type { GitHubRepositoryImport, Project, RepositoryUpload } from "@prisma/client";

export type ProjectWithRepositorySources = Project & {
  githubImports?: GitHubRepositoryImport[];
  repositoryUploads?: RepositoryUpload[];
};

export type PublicProjectRepositorySource =
  | {
      type: "github";
      label: string;
      repositoryUrl: string;
      attachedAt: string;
    }
  | {
      type: "zip";
      label: string;
      sizeBytes: number;
      attachedAt: string;
    };

export type PublicProject = {
  id: string;
  name: string;
  description: string | null;
  repositoryUrl: string | null;
  repository: PublicProjectRepositorySource | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ProjectListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ProjectDashboardStatistics = {
  activeProjects: number;
  deletedProjects: number;
  totalProjects: number;
  createdLast7Days: number;
  createdLast30Days: number;
  recentlyUpdated: PublicProject[];
};

export function toPublicProject(project: ProjectWithRepositorySources): PublicProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    repositoryUrl: project.repositoryUrl,
    repository: toPublicProjectRepositorySource(project),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    deletedAt: project.deletedAt?.toISOString() ?? null,
  };
}

function toPublicProjectRepositorySource(project: ProjectWithRepositorySources): PublicProjectRepositorySource | null {
  const latestUpload = project.repositoryUploads?.[0];
  const latestImport = project.githubImports?.[0];

  if (!latestUpload && !latestImport) {
    return project.repositoryUrl
      ? {
          type: "github",
          label: getRepositoryLabel(project.repositoryUrl),
          repositoryUrl: project.repositoryUrl,
          attachedAt: project.updatedAt.toISOString(),
        }
      : null;
  }

  if (latestImport && (!latestUpload || latestImport.createdAt >= latestUpload.createdAt)) {
    return {
      type: "github",
      label: `${latestImport.owner}/${latestImport.name}`,
      repositoryUrl: latestImport.repositoryUrl,
      attachedAt: latestImport.createdAt.toISOString(),
    };
  }

  if (latestUpload) {
    return {
      type: "zip",
      label: latestUpload.originalFilename,
      sizeBytes: latestUpload.sizeBytes,
      attachedAt: latestUpload.createdAt.toISOString(),
    };
  }

  return null;
}

function getRepositoryLabel(repositoryUrl: string): string {
  try {
    const url = new URL(repositoryUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const owner = parts[0];
    const name = parts[1]?.replace(/\.git$/i, "");

    return owner && name ? `${owner}/${name}` : repositoryUrl;
  } catch {
    return repositoryUrl;
  }
}

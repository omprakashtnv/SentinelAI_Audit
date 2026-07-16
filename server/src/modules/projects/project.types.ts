import type { Project } from "@prisma/client";

export type PublicProject = {
  id: string;
  name: string;
  description: string | null;
  repositoryUrl: string | null;
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

export function toPublicProject(project: Project): PublicProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    repositoryUrl: project.repositoryUrl,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    deletedAt: project.deletedAt?.toISOString() ?? null,
  };
}


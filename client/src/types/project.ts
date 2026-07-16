export type Project = {
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

export type ProjectListFilters = {
  page: number;
  limit: number;
  search?: string;
};

export type CreateProjectRequest = {
  name: string;
  description?: string;
  repositoryUrl?: string;
};

export type UpdateProjectRequest = {
  name?: string;
  description?: string | null;
  repositoryUrl?: string | null;
};

export type ProjectDashboardStatistics = {
  activeProjects: number;
  deletedProjects: number;
  totalProjects: number;
  createdLast7Days: number;
  createdLast30Days: number;
  recentlyUpdated: Project[];
};


import { apiEnvelopeRequest, apiRequest } from "@/services/api/api-client";
import type {
  CreateProjectRequest,
  Project,
  ProjectDashboardStatistics,
  ProjectListFilters,
  ProjectListMeta,
  UpdateProjectRequest,
} from "@/types/project";

type ProjectResponse = {
  project: Project;
};

type ProjectListResponse = {
  projects: Project[];
};

type ProjectStatisticsResponse = {
  statistics: ProjectDashboardStatistics;
};

export async function getProjects(filters: ProjectListFilters): Promise<{
  projects: Project[];
  meta: ProjectListMeta;
}> {
  const response = await apiEnvelopeRequest<ProjectListResponse>({
    path: "/projects",
    params: filters,
  });

  return {
    projects: response.data.projects,
    meta: (response.meta ?? {
      page: filters.page,
      limit: filters.limit,
      total: response.data.projects.length,
      totalPages: 1,
    }) as ProjectListMeta,
  };
}

export async function getProject(projectId: string): Promise<Project> {
  const response = await apiRequest<ProjectResponse>({
    path: `/projects/${projectId}`,
  });

  return response.project;
}

export async function createProject(input: CreateProjectRequest): Promise<Project> {
  const response = await apiRequest<ProjectResponse>({
    path: "/projects",
    method: "POST",
    data: input,
  });

  return response.project;
}

export async function updateProject(projectId: string, input: UpdateProjectRequest): Promise<Project> {
  const response = await apiRequest<ProjectResponse>({
    path: `/projects/${projectId}`,
    method: "PATCH",
    data: input,
  });

  return response.project;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiRequest<null>({
    path: `/projects/${projectId}`,
    method: "DELETE",
  });
}

export async function getProjectDashboardStatistics(): Promise<ProjectDashboardStatistics> {
  const response = await apiRequest<ProjectStatisticsResponse>({
    path: "/projects/dashboard/statistics",
  });

  return response.statistics;
}


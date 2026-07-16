import { ApiError } from "../../shared/errors/api-error";
import { ProjectRepository, projectRepository } from "./project.repository";
import type { CreateProjectInput, GetProjectsQuery, UpdateProjectInput } from "./project.schemas";
import type { ProjectDashboardStatistics, PublicProject } from "./project.types";
import { toPublicProject } from "./project.types";

type ProjectListResponse = {
  projects: PublicProject[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export class ProjectService {
  public constructor(private readonly projects: ProjectRepository) {}

  public async createProject(ownerId: string, input: CreateProjectInput): Promise<PublicProject> {
    const project = await this.projects.create(ownerId, input);

    return toPublicProject(project);
  }

  public async getMyProjects(ownerId: string, query: GetProjectsQuery): Promise<ProjectListResponse> {
    const result = await this.projects.findManyByOwner(ownerId, query);

    return {
      projects: result.projects.map(toPublicProject),
      meta: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit),
      },
    };
  }

  public async getProject(ownerId: string, projectId: string): Promise<PublicProject> {
    const project = await this.projects.findActiveByIdAndOwner(projectId, ownerId);

    if (!project) {
      throw this.notFoundError();
    }

    return toPublicProject(project);
  }

  public async updateProject(
    ownerId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<PublicProject> {
    const project = await this.projects.updateByIdAndOwner(projectId, ownerId, input);

    if (!project) {
      throw this.notFoundError();
    }

    return toPublicProject(project);
  }

  public async deleteProject(ownerId: string, projectId: string): Promise<void> {
    const wasDeleted = await this.projects.softDeleteByIdAndOwner(projectId, ownerId);

    if (!wasDeleted) {
      throw this.notFoundError();
    }
  }

  public async getDashboardStatistics(ownerId: string): Promise<ProjectDashboardStatistics> {
    const statistics = await this.projects.getDashboardStatistics(ownerId);

    return {
      ...statistics,
      recentlyUpdated: statistics.recentlyUpdated.map(toPublicProject),
    };
  }

  private notFoundError(): ApiError {
    return new ApiError({
      statusCode: 404,
      code: "PROJECT_NOT_FOUND",
      message: "Project was not found.",
    });
  }
}

export const projectService = new ProjectService(projectRepository);


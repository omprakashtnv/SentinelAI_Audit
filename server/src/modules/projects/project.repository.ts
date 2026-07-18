import type { Prisma, Project } from "@prisma/client";

import { prisma } from "../../db";
import type { CreateProjectInput, GetProjectsQuery, UpdateProjectInput } from "./project.schemas";
import type { ProjectWithRepositorySources } from "./project.types";

type ProjectListResult = {
  projects: ProjectWithRepositorySources[];
  total: number;
};

type ProjectDashboardCounts = {
  activeProjects: number;
  deletedProjects: number;
  totalProjects: number;
  createdLast7Days: number;
  createdLast30Days: number;
  recentlyUpdated: ProjectWithRepositorySources[];
};

const latestRepositorySourceInclude = {
  githubImports: {
    orderBy: { createdAt: "desc" },
    take: 1,
  },
  repositoryUploads: {
    orderBy: { createdAt: "desc" },
    take: 1,
  },
} satisfies Prisma.ProjectInclude;

export class ProjectRepository {
  public create(ownerId: string, input: CreateProjectInput): Promise<Project> {
    return prisma.project.create({
      data: {
        ownerId,
        name: input.name,
        description: input.description,
        repositoryUrl: input.repositoryUrl,
      },
    });
  }

  public async findManyByOwner(ownerId: string, query: GetProjectsQuery): Promise<ProjectListResult> {
    const where: Prisma.ProjectWhereInput = {
      ownerId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
              { repositoryUrl: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.limit;

    const [projects, total] = await prisma.$transaction([
      prisma.project.findMany({
        where,
        include: latestRepositorySourceInclude,
        orderBy: { updatedAt: "desc" },
        skip,
        take: query.limit,
      }),
      prisma.project.count({ where }),
    ]);

    return { projects, total };
  }

  public findActiveByIdAndOwner(projectId: string, ownerId: string): Promise<ProjectWithRepositorySources | null> {
    return prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId,
        deletedAt: null,
      },
      include: latestRepositorySourceInclude,
    });
  }

  public async updateByIdAndOwner(
    projectId: string,
    ownerId: string,
    input: UpdateProjectInput,
  ): Promise<Project | null> {
    const updateResult = await prisma.project.updateMany({
      where: {
        id: projectId,
        ownerId,
        deletedAt: null,
      },
      data: {
        name: input.name,
        description: input.description,
        repositoryUrl: input.repositoryUrl,
      },
    });

    if (updateResult.count === 0) {
      return null;
    }

    return this.findActiveByIdAndOwner(projectId, ownerId);
  }

  public async softDeleteByIdAndOwner(projectId: string, ownerId: string): Promise<boolean> {
    const deleteResult = await prisma.project.updateMany({
      where: {
        id: projectId,
        ownerId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return deleteResult.count === 1;
  }

  public async getDashboardStatistics(ownerId: string): Promise<ProjectDashboardCounts> {
    const now = Date.now();
    const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      activeProjects,
      deletedProjects,
      totalProjects,
      createdLast7Days,
      createdLast30Days,
      recentlyUpdated,
    ] = await prisma.$transaction([
      prisma.project.count({
        where: {
          ownerId,
          deletedAt: null,
        },
      }),
      prisma.project.count({
        where: {
          ownerId,
          deletedAt: { not: null },
        },
      }),
      prisma.project.count({
        where: { ownerId },
      }),
      prisma.project.count({
        where: {
          ownerId,
          deletedAt: null,
          createdAt: { gte: last7Days },
        },
      }),
      prisma.project.count({
        where: {
          ownerId,
          deletedAt: null,
          createdAt: { gte: last30Days },
        },
      }),
      prisma.project.findMany({
        where: {
          ownerId,
          deletedAt: null,
        },
        include: latestRepositorySourceInclude,
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    return {
      activeProjects,
      deletedProjects,
      totalProjects,
      createdLast7Days,
      createdLast30Days,
      recentlyUpdated,
    };
  }
}

export const projectRepository = new ProjectRepository();

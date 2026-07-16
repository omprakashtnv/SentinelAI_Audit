import type { RequestHandler } from "express";

import { ApiError } from "../../shared/errors/api-error";
import { sendSuccess } from "../../shared/http/api-response";
import type { GetProjectsQuery } from "./project.schemas";
import { projectService } from "./project.service";

function getAuthenticatedUserId(request: Parameters<RequestHandler>[0]): string {
  if (!request.user) {
    throw new ApiError({
      statusCode: 401,
      code: "UNAUTHENTICATED",
      message: "Authentication is required.",
    });
  }

  return request.user.id;
}

function getProjectId(request: Parameters<RequestHandler>[0]): string {
  const projectId = request.params.projectId;

  if (!projectId) {
    throw new ApiError({
      statusCode: 400,
      code: "PROJECT_ID_REQUIRED",
      message: "Project ID is required.",
    });
  }

  return projectId;
}

export const createProject: RequestHandler = async (request, response) => {
  const project = await projectService.createProject(getAuthenticatedUserId(request), request.body);

  sendSuccess(response, {
    statusCode: 201,
    message: "Project created.",
    data: { project },
  });
};

export const getMyProjects: RequestHandler = async (request, response) => {
  const result = await projectService.getMyProjects(
    getAuthenticatedUserId(request),
    request.query as unknown as GetProjectsQuery,
  );

  sendSuccess(response, {
    data: {
      projects: result.projects,
    },
    meta: result.meta,
  });
};

export const getProject: RequestHandler = async (request, response) => {
  const project = await projectService.getProject(getAuthenticatedUserId(request), getProjectId(request));

  sendSuccess(response, {
    data: { project },
  });
};

export const updateProject: RequestHandler = async (request, response) => {
  const project = await projectService.updateProject(
    getAuthenticatedUserId(request),
    getProjectId(request),
    request.body,
  );

  sendSuccess(response, {
    message: "Project updated.",
    data: { project },
  });
};

export const deleteProject: RequestHandler = async (request, response) => {
  await projectService.deleteProject(getAuthenticatedUserId(request), getProjectId(request));

  sendSuccess(response, {
    message: "Project deleted.",
    data: null,
  });
};

export const getProjectDashboardStatistics: RequestHandler = async (request, response) => {
  const statistics = await projectService.getDashboardStatistics(getAuthenticatedUserId(request));

  sendSuccess(response, {
    data: { statistics },
  });
};

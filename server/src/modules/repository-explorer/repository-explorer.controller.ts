import type { RequestHandler } from "express";

import { ApiError } from "../../shared/errors/api-error";
import { sendSuccess } from "../../shared/http/api-response";
import type { RepositoryFileQuery } from "./repository-explorer.schemas";
import { repositoryExplorerService } from "./repository-explorer.service";

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

export const getRepositoryExplorer: RequestHandler = async (request, response) => {
  const repository = await repositoryExplorerService.getRepository(
    getAuthenticatedUserId(request),
    getProjectId(request),
  );

  sendSuccess(response, {
    data: { repository },
  });
};

export const getRepositorySource: RequestHandler = async (request, response) => {
  const source = await repositoryExplorerService.getRepositorySource(
    getAuthenticatedUserId(request),
    getProjectId(request),
  );

  sendSuccess(response, {
    data: { source },
  });
};

export const getRepositoryFileContent: RequestHandler = async (request, response) => {
  const query = request.query as unknown as RepositoryFileQuery;
  const file = await repositoryExplorerService.getFileContent({
    ownerId: getAuthenticatedUserId(request),
    projectId: getProjectId(request),
    relativePath: query.path,
  });

  sendSuccess(response, {
    data: { file },
  });
};

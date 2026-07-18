import type { RequestHandler } from "express";

import { ApiError } from "../../shared/errors/api-error";
import { sendSuccess } from "../../shared/http/api-response";
import { uploadService } from "./upload.service";

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

export const uploadRepositoryZip: RequestHandler = async (request, response) => {
  const result = await uploadService.uploadRepositoryZip({
    ownerId: getAuthenticatedUserId(request),
    projectId: getProjectId(request),
    file: request.file,
  });

  sendSuccess(response, {
    statusCode: 201,
    message: "Repository ZIP uploaded and extracted.",
    data: result,
  });
};


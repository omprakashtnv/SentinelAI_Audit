import type { RequestHandler } from "express";

import { ApiError } from "../../shared/errors/api-error";
import { sendSuccess } from "../../shared/http/api-response";
import type { GetFindingsQuery } from "./finding.schemas";
import { findingService } from "./finding.service";

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

function getRequiredParam(request: Parameters<RequestHandler>[0], name: string): string {
  const value = request.params[name];

  if (!value) {
    throw new ApiError({
      statusCode: 400,
      code: "ROUTE_PARAMETER_REQUIRED",
      message: `${name} is required.`,
    });
  }

  return value;
}

export const createFinding: RequestHandler = async (request, response) => {
  const finding = await findingService.createFinding(
    getAuthenticatedUserId(request),
    getRequiredParam(request, "projectId"),
    request.body,
  );

  sendSuccess(response, {
    statusCode: 201,
    message: "Finding created.",
    data: { finding },
  });
};

export const getFindings: RequestHandler = async (request, response) => {
  const result = await findingService.getFindings(
    getAuthenticatedUserId(request),
    getRequiredParam(request, "projectId"),
    request.query as unknown as GetFindingsQuery,
  );

  sendSuccess(response, {
    data: {
      findings: result.findings,
      summary: result.summary,
    },
    meta: result.meta,
  });
};

export const getFinding: RequestHandler = async (request, response) => {
  const finding = await findingService.getFinding(
    getAuthenticatedUserId(request),
    getRequiredParam(request, "projectId"),
    getRequiredParam(request, "findingId"),
  );

  sendSuccess(response, {
    data: { finding },
  });
};

export const getFindingExplanation: RequestHandler = async (request, response) => {
  const explanation = await findingService.getFindingExplanation(
    getAuthenticatedUserId(request),
    getRequiredParam(request, "projectId"),
    getRequiredParam(request, "findingId"),
  );

  sendSuccess(response, {
    data: { explanation },
  });
};

export const getFindingFixPreview: RequestHandler = async (request, response) => {
  const fixPreview = await findingService.getFindingFixPreview(
    getAuthenticatedUserId(request),
    getRequiredParam(request, "projectId"),
    getRequiredParam(request, "findingId"),
  );

  sendSuccess(response, {
    data: { fixPreview },
  });
};

export const updateFinding: RequestHandler = async (request, response) => {
  const finding = await findingService.updateFinding(
    getAuthenticatedUserId(request),
    getRequiredParam(request, "projectId"),
    getRequiredParam(request, "findingId"),
    request.body,
  );

  sendSuccess(response, {
    message: "Finding updated.",
    data: { finding },
  });
};

export const dismissFinding: RequestHandler = async (request, response) => {
  const finding = await findingService.dismissFinding(
    getAuthenticatedUserId(request),
    getRequiredParam(request, "projectId"),
    getRequiredParam(request, "findingId"),
  );

  sendSuccess(response, {
    message: "Finding dismissed.",
    data: { finding },
  });
};

export const resolveFinding: RequestHandler = async (request, response) => {
  const finding = await findingService.resolveFinding(
    getAuthenticatedUserId(request),
    getRequiredParam(request, "projectId"),
    getRequiredParam(request, "findingId"),
  );

  sendSuccess(response, {
    message: "Finding resolved.",
    data: { finding },
  });
};

export const deleteFinding: RequestHandler = async (request, response) => {
  await findingService.deleteFinding(
    getAuthenticatedUserId(request),
    getRequiredParam(request, "projectId"),
    getRequiredParam(request, "findingId"),
  );

  sendSuccess(response, {
    message: "Finding deleted.",
    data: null,
  });
};

import type { RequestHandler } from "express";

import { ApiError } from "../../shared/errors/api-error";
import { sendSuccess } from "../../shared/http/api-response";
import type { ScanListQuery } from "./scan.schemas";
import { scanService } from "./scan.service";

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

export const createScan: RequestHandler = async (request, response) => {
  const scan = await scanService.createScan(
    getAuthenticatedUserId(request),
    getRequiredParam(request, "projectId"),
  );

  sendSuccess(response, {
    statusCode: 201,
    message: "Scan queued.",
    data: { scan },
  });
};

export const getScans: RequestHandler = async (request, response) => {
  const result = await scanService.getScans(
    getAuthenticatedUserId(request),
    getRequiredParam(request, "projectId"),
    request.query as unknown as ScanListQuery,
  );

  sendSuccess(response, {
    data: {
      scans: result.scans,
    },
    meta: result.meta,
  });
};

export const getScan: RequestHandler = async (request, response) => {
  const scan = await scanService.getScan(
    getAuthenticatedUserId(request),
    getRequiredParam(request, "projectId"),
    getRequiredParam(request, "scanId"),
  );

  sendSuccess(response, {
    data: { scan },
  });
};

export const cancelScan: RequestHandler = async (request, response) => {
  const scan = await scanService.cancelScan(
    getAuthenticatedUserId(request),
    getRequiredParam(request, "projectId"),
    getRequiredParam(request, "scanId"),
  );

  sendSuccess(response, {
    message: "Scan cancelled.",
    data: { scan },
  });
};

export const retryScan: RequestHandler = async (request, response) => {
  const scan = await scanService.retryScan(
    getAuthenticatedUserId(request),
    getRequiredParam(request, "projectId"),
    getRequiredParam(request, "scanId"),
  );

  sendSuccess(response, {
    statusCode: 201,
    message: "Scan retry queued.",
    data: { scan },
  });
};

import type { RequestHandler, Response } from "express";

import { ApiError } from "../../shared/errors/api-error";
import { scanProgressService } from "./scan-progress.service";
import { scanService } from "./scan.service";
import type { ScanProgressSnapshot } from "./scan-progress.types";

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

export const streamScanProgress: RequestHandler = async (request, response) => {
  const ownerId = getAuthenticatedUserId(request);
  const projectId = getRequiredParam(request, "projectId");
  const scanId = getRequiredParam(request, "scanId");
  const scan = await scanService.getScan(ownerId, projectId, scanId);

  prepareSseResponse(response);

  writeSse(
    response,
    "scan.progress",
    scanProgressService.getSnapshot(scanId) ?? {
      scanId,
      status: scan.status,
      currentStep: getStepFromStatus(scan.status),
      currentFile: null,
      percentage: scan.progress,
      estimatedTimeRemainingMs: null,
      updatedAt: new Date().toISOString(),
    },
  );

  const unsubscribe = scanProgressService.subscribe(scanId, (snapshot) => {
    writeSse(response, "scan.progress", snapshot);
  });
  const keepAlive = setInterval(() => {
    response.write(": keep-alive\n\n");
  }, 15_000);

  request.on("close", () => {
    clearInterval(keepAlive);
    unsubscribe();
    response.end();
  });
};

function prepareSseResponse(response: Response): void {
  response.status(200);
  response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders();
}

function writeSse(response: Response, event: string, snapshot: ScanProgressSnapshot): void {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(snapshot)}\n\n`);
}

function getStepFromStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}


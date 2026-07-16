import type { RequestHandler } from "express";

import { environment } from "../../config/environment";
import { sendSuccess } from "../../shared/http/api-response";

export const getHealth: RequestHandler = (_request, response) => {
  sendSuccess(response, {
    statusCode: 200,
    data: {
      status: "ok",
      service: "sentinelai-api",
      environment: environment.nodeEnv,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
};


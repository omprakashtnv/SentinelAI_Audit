import type { Response } from "express";

type SuccessResponseOptions<TData> = {
  statusCode?: number;
  data: TData;
  message?: string;
  meta?: Record<string, unknown>;
};

type ErrorResponseOptions = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
};

export function sendSuccess<TData>(
  response: Response,
  options: SuccessResponseOptions<TData>,
): void {
  response.status(options.statusCode ?? 200).json({
    success: true,
    message: options.message,
    data: options.data,
    meta: options.meta,
  });
}

export function sendError(response: Response, options: ErrorResponseOptions): void {
  response.status(options.statusCode).json({
    success: false,
    error: {
      code: options.code,
      message: options.message,
      details: options.details,
      requestId: options.requestId,
    },
  });
}


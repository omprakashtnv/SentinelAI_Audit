import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRequestHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
) => Promise<unknown> | unknown;

export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (request: Request, response: Response, next: NextFunction): void => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

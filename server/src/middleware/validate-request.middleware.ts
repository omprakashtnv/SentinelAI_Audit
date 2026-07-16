import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { z, ZodTypeAny } from "zod";

type RequestValidationSchemas = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

export function validateRequest(schemas: RequestValidationSchemas): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        request.body = schemas.body.parse(request.body) as z.infer<typeof schemas.body>;
      }

      if (schemas.params) {
        request.params = schemas.params.parse(request.params) as z.infer<typeof schemas.params>;
      }

      if (schemas.query) {
        request.query = schemas.query.parse(request.query) as z.infer<typeof schemas.query>;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}


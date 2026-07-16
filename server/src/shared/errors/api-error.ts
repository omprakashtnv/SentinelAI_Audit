export type ApiErrorOptions = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  isOperational?: boolean;
};

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  public constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = "ApiError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;

    Error.captureStackTrace(this, this.constructor);
  }
}


export type ApiSuccessResponse<TData> = {
  success: true;
  message?: string;
  data: TData;
  meta?: Record<string, unknown>;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
};


import axios, { AxiosError, type AxiosRequestConfig } from "axios";

import { environment } from "@/config/environment";
import {
  clearAuthSession,
  getAccessToken,
  setAuthSession,
} from "@/services/api/auth-session-store";
import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/api";
import type { AuthSession } from "@/types/auth";

type ApiRequestOptions = AxiosRequestConfig & {
  path: string;
};

type RetriableRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
};

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  public constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const publicApi = axios.create({
  baseURL: environment.apiBaseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const api = axios.create({
  baseURL: environment.apiBaseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshSessionPromise: Promise<AuthSession> | null = null;

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (!originalRequest || originalRequest._retry || error.response?.status !== 401) {
      throw normalizeApiError(error);
    }

    originalRequest._retry = true;

    try {
      const session = await refreshAuthSession();
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${session.accessToken}`,
      };

      return api.request(originalRequest);
    } catch (refreshError) {
      clearAuthSession();
      throw normalizeApiError(refreshError);
    }
  },
);

export async function apiRequest<TData>({ path, ...config }: ApiRequestOptions): Promise<TData> {
  try {
    const response = await api.request<ApiSuccessResponse<TData>>({
      ...config,
      url: path,
    });

    return response.data.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function publicApiRequest<TData>({ path, ...config }: ApiRequestOptions): Promise<TData> {
  try {
    const response = await publicApi.request<ApiSuccessResponse<TData>>({
      ...config,
      url: path,
    });

    return response.data.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

async function refreshAuthSession(): Promise<AuthSession> {
  refreshSessionPromise ??= publicApiRequest<AuthSession>({
    path: "/auth/refresh-token",
    method: "POST",
  })
    .then((session) => {
      setAuthSession(session);
      return session;
    })
    .finally(() => {
      refreshSessionPromise = null;
    });

  return refreshSessionPromise;
}

export function normalizeApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status ?? 0;
    const payload = error.response?.data;

    if (payload?.success === false) {
      return new ApiClientError(
        payload.error.message,
        status,
        payload.error.code,
        payload.error.details,
      );
    }

    return new ApiClientError(error.message, status, "NETWORK_OR_SERVER_ERROR");
  }

  if (error instanceof Error) {
    return new ApiClientError(error.message, 0, "UNKNOWN_CLIENT_ERROR");
  }

  return new ApiClientError("An unknown error occurred.", 0, "UNKNOWN_CLIENT_ERROR");
}


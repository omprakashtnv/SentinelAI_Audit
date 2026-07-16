import { apiRequest } from "@/services/api/api-client";

export type HealthResponse = {
  status: "ok";
  service: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
};

export function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>({
    path: "/health",
  });
}

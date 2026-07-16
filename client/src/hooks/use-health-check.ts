import { useQuery } from "@tanstack/react-query";

import { getHealth } from "@/services/api/health";

export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
  });
}


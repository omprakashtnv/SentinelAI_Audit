import { z } from "zod";

const environmentSchema = z.object({
  VITE_APP_NAME: z.string().default("SentinelAI"),
  VITE_API_BASE_URL: z.string().url().default("http://localhost:4000/api"),
  VITE_APP_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsedEnvironment = environmentSchema.safeParse(import.meta.env);

if (!parsedEnvironment.success) {
  const details = parsedEnvironment.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  throw new Error(`Invalid client environment configuration: ${JSON.stringify(details)}`);
}

const env = parsedEnvironment.data;

export const environment = {
  appName: env.VITE_APP_NAME,
  apiBaseUrl: env.VITE_API_BASE_URL,
  appEnv: env.VITE_APP_ENV,
  isProduction: env.VITE_APP_ENV === "production",
} as const;


import type OpenAI from "openai";

import type { RepositoryChunk } from "../chunk-generator";
import type { SecurityFinding } from "../rule-based-scanner";
import type { AiSecurityScanOutput } from "./openai.schemas";

export type OpenAIServiceConfig = {
  apiKey?: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
  temperature: number;
  maxOutputTokens: number;
  streamingEnabled: boolean;
};

export type OpenAIClient = Pick<OpenAI, "responses">;

export type OpenAISecurityScanInput = {
  chunk: RepositoryChunk;
  prompt: string;
  stream?: boolean;
  onDelta?: (delta: string) => void;
};

export type OpenAISecurityScanResult = {
  responseId: string | null;
  model: string;
  findings: SecurityFinding[];
  raw: AiSecurityScanOutput;
};


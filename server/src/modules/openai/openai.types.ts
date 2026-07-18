import type OpenAI from "openai";

import type { RepositoryChunk } from "../chunk-generator";
import type { SecurityFinding } from "../rule-based-scanner";
import type { AiSecurityScanOutput, OpenAIFixEnhancementOutput } from "./openai.schemas";

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

export type OpenAIFixEnhancementInput = {
  finding: {
    title: string;
    severity: string;
    file: string;
    line: number;
    category: string | null;
    owasp: string | null;
    confidence: string | null;
  };
  template: {
    explanation: string;
    recommendation: string;
    originalCode: string;
    generatedFix: string;
    language: string;
  };
};

export type OpenAIFixEnhancementResult = {
  responseId: string | null;
  model: string;
  enhancement: OpenAIFixEnhancementOutput;
};

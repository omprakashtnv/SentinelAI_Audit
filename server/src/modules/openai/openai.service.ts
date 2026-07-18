import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { environment } from "../../config/environment";
import { ApiError } from "../../shared/errors/api-error";
import { aiResponseValidatorService, AiResponseValidatorService } from "../ai-response-validator";
import type { SecurityFinding } from "../rule-based-scanner";
import { aiSecurityScanResultSchema, type AiSecurityFindingOutput } from "./openai.schemas";
import type { OpenAIClient, OpenAISecurityScanInput, OpenAISecurityScanResult, OpenAIServiceConfig } from "./openai.types";

const SECURITY_SCAN_RESPONSE_FORMAT_NAME = "sentinel_security_findings";

export class OpenAIService {
  private client: OpenAIClient | null;
  private disabledReason: string | null = null;

  public constructor(
    private readonly config: OpenAIServiceConfig = environment.openai,
    client: OpenAIClient | null = null,
    private readonly validator: AiResponseValidatorService = aiResponseValidatorService,
  ) {
    this.client = client;
  }

  public isConfigured(): boolean {
    return !this.disabledReason && Boolean(this.config.apiKey || this.client);
  }

  public getDisabledReason(): string | null {
    return this.disabledReason;
  }

  public async scanSecurityChunk(input: OpenAISecurityScanInput): Promise<OpenAISecurityScanResult> {
    if (!this.isConfigured()) {
      throw new ApiError({
        statusCode: 503,
        code: "OPENAI_NOT_CONFIGURED",
        message: "OpenAI API key is not configured.",
      });
    }

    try {
      return input.stream ?? this.config.streamingEnabled
        ? await this.streamSecurityChunk(input)
        : await this.createSecurityChunkResponse(input);
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private async createSecurityChunkResponse(input: OpenAISecurityScanInput): Promise<OpenAISecurityScanResult> {
    const request = this.createSecurityScanRequest(input);
    const response = await this.getClient().responses.create(request, {
      maxRetries: this.config.maxRetries,
      timeout: this.config.timeoutMs,
    });
    const validation = this.validator.validate({
      response: this.getResponsePayload(response),
      allowRepair: true,
    });

    return {
      responseId: response.id ?? null,
      model: response.model ?? this.config.model,
      findings: this.toSecurityFindings(validation.data.findings, input.chunk.chunkId),
      raw: validation.data,
    };
  }

  private async streamSecurityChunk(input: OpenAISecurityScanInput): Promise<OpenAISecurityScanResult> {
    const request = this.createSecurityScanRequest(input);
    const stream = this.getClient().responses.stream(
      {
        ...request,
        stream: true,
      },
      {
        maxRetries: this.config.maxRetries,
        timeout: this.config.timeoutMs,
      },
    );

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        input.onDelta?.(event.delta);
      }

      if (event.type === "error") {
        throw new Error(JSON.stringify(event));
      }
    }

    const response = await stream.finalResponse();
    const validation = this.validator.validate({
      response: this.getResponsePayload(response),
      allowRepair: true,
    });

    return {
      responseId: response.id ?? null,
      model: response.model ?? this.config.model,
      findings: this.toSecurityFindings(validation.data.findings, input.chunk.chunkId),
      raw: validation.data,
    };
  }

  private createSecurityScanRequest(input: OpenAISecurityScanInput) {
    return {
      model: this.config.model,
      instructions: [
        "You are SentinelAI's security scan engine.",
        "Return validated JSON only. Never return markdown, prose wrappers, code fences, or comments.",
        "Each finding must include severity, title, description, file, line, owasp, recommendation, and confidence.",
        "Report only concrete, evidence-backed security findings visible in the supplied prompt and chunk metadata.",
        "If no findings are present, return {\"findings\":[]}.",
      ].join("\n"),
      input: [
        input.prompt,
        "",
        "Chunk context:",
        JSON.stringify(
          {
            chunkId: input.chunk.chunkId,
            priority: input.chunk.priority,
            language: input.chunk.language,
            estimatedTokenCount: input.chunk.estimatedTokenCount,
            files: input.chunk.files.map((file) => ({
              relativePath: file.relativePath,
              language: file.language,
              extension: file.extension,
              sizeBytes: file.sizeBytes,
              sha256: file.sha256,
              lineCount: file.lineCount,
              role: file.role,
              part: file.part,
            })),
          },
          null,
          2,
        ),
      ].join("\n"),
      text: {
        format: zodTextFormat(aiSecurityScanResultSchema, SECURITY_SCAN_RESPONSE_FORMAT_NAME),
      },
      temperature: this.config.temperature,
      max_output_tokens: this.config.maxOutputTokens,
      store: false,
    };
  }

  private toSecurityFindings(findings: AiSecurityFindingOutput[], chunkId: string): SecurityFinding[] {
    return findings.map((finding) => ({
      ruleId: `ai.${chunkId}.${this.slugify(finding.title)}`,
      severity: finding.severity,
      title: finding.title,
      description: finding.description,
      file: finding.file,
      line: finding.line,
      category: this.toSecurityCategory(`${finding.title} ${finding.description} ${finding.owasp}`),
      owasp: finding.owasp,
      recommendation: finding.recommendation,
      confidence: finding.confidence,
    }));
  }

  private toSecurityCategory(category: string): SecurityFinding["category"] {
    const normalizedCategory = category.toLowerCase();

    if (/\b(secret|credential|token|jwt|api[_ -]?key|password|private key|aws)\b/.test(normalizedCategory)) {
      return "secrets";
    }

    if (/\b(sql|query|injection|prisma|raw)\b/.test(normalizedCategory)) {
      return "injection";
    }

    if (/\b(exec|spawn|command|shell|process)\b/.test(normalizedCategory)) {
      return "unsafe_process_execution";
    }

    if (/\b(xss|cross-site|cross site|dangerouslysetinnerhtml|html injection)\b/.test(normalizedCategory)) {
      return "xss";
    }

    if (/\b(log|logging|console)\b/.test(normalizedCategory)) {
      return "logging";
    }

    if (/\b(validate|validation|schema|zod|input)\b/.test(normalizedCategory)) {
      return "validation";
    }

    return "configuration";
  }

  private slugify(value: string): string {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    return slug || "finding";
  }

  private getClient(): OpenAIClient {
    if (this.client) {
      return this.client;
    }

    if (!this.config.apiKey) {
      throw new ApiError({
        statusCode: 503,
        code: "OPENAI_NOT_CONFIGURED",
        message: "OpenAI API key is not configured.",
      });
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      maxRetries: this.config.maxRetries,
      timeout: this.config.timeoutMs,
    });

    return this.client;
  }

  private getResponsePayload(response: unknown): unknown {
    const parsed = (response as { output_parsed?: unknown }).output_parsed;

    if (parsed) {
      return parsed;
    }

    return this.getOutputText(response) ?? response;
  }

  private getOutputText(response: unknown): string | null {
    const outputText = (response as { output_text?: unknown }).output_text;

    if (typeof outputText === "string" && outputText.trim().length > 0) {
      return outputText;
    }

    const output = (response as { output?: unknown }).output;

    if (!Array.isArray(output)) {
      return null;
    }

    const textParts: string[] = [];

    for (const item of output) {
      const content = (item as { content?: unknown }).content;

      if (!Array.isArray(content)) {
        continue;
      }

      for (const part of content) {
        const text = (part as { text?: unknown }).text;

        if (typeof text === "string") {
          textParts.push(text);
        }
      }
    }

    return textParts.length > 0 ? textParts.join("") : null;
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof ApiError) {
      return error;
    }

    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return new ApiError({
        statusCode: 504,
        code: "OPENAI_TIMEOUT",
        message: "OpenAI request timed out.",
      });
    }

    if (error instanceof OpenAI.APIError) {
      const statusCode = error.status && error.status >= 400 && error.status < 600 ? error.status : 502;

      if (statusCode === 401) {
        this.disabledReason = "OPENAI_INVALID_API_KEY";

        return new ApiError({
          statusCode,
          code: "OPENAI_INVALID_API_KEY",
          message: "OpenAI API key is invalid or no longer active.",
          details: {
            requestId: error.requestID,
            status: error.status,
            type: error.name,
          },
        });
      }

      if (statusCode === 429) {
        this.disabledReason = "OPENAI_QUOTA_EXCEEDED";

        return new ApiError({
          statusCode,
          code: "OPENAI_QUOTA_EXCEEDED",
          message: "OpenAI quota or rate limit was exceeded.",
          details: {
            requestId: error.requestID,
            status: error.status,
            type: error.name,
          },
        });
      }

      return new ApiError({
        statusCode,
        code: "OPENAI_API_ERROR",
        message: "OpenAI request failed.",
        details: {
          requestId: error.requestID,
          status: error.status,
          type: error.name,
        },
      });
    }

    return error instanceof Error
      ? error
      : new ApiError({
          statusCode: 502,
          code: "OPENAI_UNKNOWN_ERROR",
          message: "OpenAI request failed.",
        });
  }
}

export const openAIService = new OpenAIService();

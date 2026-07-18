import { ApiError } from "../../shared/errors/api-error";
import { aiResponseSchema, type ValidatedAiResponse } from "./ai-response-validator.schemas";
import type { AiResponseValidationInput, AiResponseValidationResult } from "./ai-response-validator.types";

export class AiResponseValidatorService {
  public validate(input: AiResponseValidationInput): AiResponseValidationResult {
    const directValidation = this.validateValue(input.response);

    if (directValidation) {
      return {
        data: directValidation,
        repaired: false,
      };
    }

    if (typeof input.response !== "string") {
      this.throwInvalidResponse(input.response);
    }

    const parsedJson = this.parseJson(input.response);

    if (parsedJson.ok) {
      const parsedValidation = this.validateValue(parsedJson.value);

      if (parsedValidation) {
        return {
          data: parsedValidation,
          repaired: false,
        };
      }
    }

    if (input.allowRepair === false) {
      this.throwInvalidResponse(parsedJson.ok ? parsedJson.value : input.response);
    }

    const repairedJson = this.parseJson(this.repairJson(input.response));

    if (!repairedJson.ok) {
      throw new ApiError({
        statusCode: 502,
        code: "AI_RESPONSE_MALFORMED_JSON",
        message: "AI response was malformed JSON and could not be repaired.",
        details: {
          reason: repairedJson.error.message,
        },
      });
    }

    const repairedValidation = this.validateValue(repairedJson.value);

    if (!repairedValidation) {
      this.throwInvalidResponse(repairedJson.value);
    }

    return {
      data: repairedValidation,
      repaired: true,
    };
  }

  private validateValue(value: unknown): ValidatedAiResponse | null {
    const normalizedValue = Array.isArray(value) ? { findings: value } : value;
    const parsed = aiResponseSchema.safeParse(normalizedValue);

    return parsed.success ? parsed.data : null;
  }

  private parseJson(value: string): { ok: true; value: unknown } | { ok: false; error: Error } {
    try {
      return {
        ok: true,
        value: JSON.parse(value),
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error("Unable to parse JSON."),
      };
    }
  }

  private repairJson(value: string): string {
    let repaired = value.trim().replace(/^\uFEFF/, "");

    repaired = this.stripMarkdownFence(repaired);
    repaired = this.extractJsonPayload(repaired);
    repaired = repaired
      .replace(/[“”]/g, "\"")
      .replace(/[‘’]/g, "'")
      .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, ": \"$1\"")
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, "$1\"$2\":");

    if (repaired.trim().startsWith("[")) {
      repaired = `{"findings":${repaired}}`;
    }

    return repaired;
  }

  private stripMarkdownFence(value: string): string {
    const fenceMatch = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

    return fenceMatch?.[1]?.trim() ?? value;
  }

  private extractJsonPayload(value: string): string {
    const objectStart = value.indexOf("{");
    const arrayStart = value.indexOf("[");
    const starts: number[] = [];

    if (objectStart >= 0) {
      starts.push(objectStart);
    }

    if (arrayStart >= 0) {
      starts.push(arrayStart);
    }

    if (starts.length === 0) {
      return value;
    }

    const start = Math.min(...starts);
    const opening = value[start];
    const closing = opening === "{" ? "}" : "]";
    const end = value.lastIndexOf(closing);

    if (end <= start) {
      return value.slice(start);
    }

    return value.slice(start, end + 1);
  }

  private throwInvalidResponse(value: unknown): never {
    const parsed = aiResponseSchema.safeParse(Array.isArray(value) ? { findings: value } : value);

    throw new ApiError({
      statusCode: 502,
      code: "AI_RESPONSE_INVALID_SCHEMA",
      message: "AI response did not match the required finding schema.",
      details: parsed.success ? undefined : parsed.error.flatten(),
    });
  }
}

export const aiResponseValidatorService = new AiResponseValidatorService();

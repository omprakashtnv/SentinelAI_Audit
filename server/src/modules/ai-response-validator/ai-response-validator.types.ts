import type { ValidatedAiResponse } from "./ai-response-validator.schemas";

export type AiResponseValidationInput = {
  response: unknown;
  allowRepair?: boolean;
};

export type AiResponseValidationResult = {
  data: ValidatedAiResponse;
  repaired: boolean;
};


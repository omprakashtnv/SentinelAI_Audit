import { z } from "zod";

export {
  aiFindingSchema as aiSecurityFindingSchema,
  aiResponseSchema as aiSecurityScanResultSchema,
} from "../ai-response-validator";
export type {
  ValidatedAiFinding as AiSecurityFindingOutput,
  ValidatedAiResponse as AiSecurityScanOutput,
} from "../ai-response-validator";

export const openAIFixEnhancementSchema = z.object({
  explanation: z.string().trim().min(20).max(6_000),
  recommendation: z.string().trim().min(20).max(4_000),
  generatedFix: z.string().trim().min(1).max(20_000),
});

export type OpenAIFixEnhancementOutput = z.infer<typeof openAIFixEnhancementSchema>;

import { z } from "zod";

const uppercaseString = (value: unknown) => (typeof value === "string" ? value.toUpperCase() : value);

export const aiFindingSchema = z
  .object({
    severity: z.preprocess(uppercaseString, z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"])),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    file: z.string().trim().min(1),
    line: z.preprocess((value) => {
      if (typeof value === "string" && /^\d+$/.test(value.trim())) {
        return Number(value);
      }

      return value;
    }, z.number().int().positive()),
    owasp: z.string().trim().min(1),
    recommendation: z.string().trim().min(1),
    confidence: z.preprocess(uppercaseString, z.enum(["HIGH", "MEDIUM", "LOW"])),
  })
  .strict();

export const aiResponseSchema = z
  .object({
    findings: z.array(aiFindingSchema),
  })
  .strict();

export type ValidatedAiFinding = z.infer<typeof aiFindingSchema>;
export type ValidatedAiResponse = z.infer<typeof aiResponseSchema>;

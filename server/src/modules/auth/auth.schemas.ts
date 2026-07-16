import { z } from "zod";

const passwordSchema = z
  .string()
  .min(12, "Password must contain at least 12 characters.")
  .max(128, "Password must contain at most 128 characters.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol.");

export const registerSchema = z.object({
  email: z.string().email().max(320).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(1).max(120).optional(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;


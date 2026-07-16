import { z } from "zod";

export const loginFormSchema = z.object({
  email: z.string().email("Enter a valid email address.").max(320),
  password: z.string().min(1, "Password is required."),
});

export const registerFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(120, "Name is too long."),
    email: z.string().email("Enter a valid email address.").max(320),
    password: z
      .string()
      .min(12, "Password must contain at least 12 characters.")
      .max(128, "Password must contain at most 128 characters.")
      .regex(/[a-z]/, "Password must include a lowercase letter.")
      .regex(/[A-Z]/, "Password must include an uppercase letter.")
      .regex(/[0-9]/, "Password must include a number.")
      .regex(/[^A-Za-z0-9]/, "Password must include a symbol."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const forgotPasswordFormSchema = z.object({
  email: z.string().email("Enter a valid email address.").max(320),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;


import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Ingresá un email válido."));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Ingresá tu contraseña."),
  next: z.string().optional(),
});

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Ingresá tu nombre.").max(120),
    email,
    password: z
      .string()
      .min(10, "Usá al menos 10 caracteres.")
      .max(128)
      .regex(/[a-z]/, "Incluí una minúscula.")
      .regex(/[A-Z]/, "Incluí una mayúscula.")
      .regex(/[0-9]/, "Incluí un número."),
    confirmPassword: z.string(),
    accountType: z.enum(["PERSON", "PROFESSIONAL"]),
    terms: z.literal("on", {
      error: "Necesitamos que aceptes los términos y la política de privacidad.",
    }),
    next: z.string().optional(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export const passwordResetRequestSchema = z.object({ email });

export const passwordUpdateSchema = z
  .object({
    password: z
      .string()
      .min(10, "Usá al menos 10 caracteres.")
      .max(128)
      .regex(/[a-z]/, "Incluí una minúscula.")
      .regex(/[A-Z]/, "Incluí una mayúscula.")
      .regex(/[0-9]/, "Incluí un número."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[]>;
};

export const initialAuthState: AuthFormState = { status: "idle" };

import { z } from "zod";

export const PASSWORD_MIN = 8;

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));
const password = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(72, "Use 72 characters or fewer.");

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Tell us what to call you.").max(60, "Use 60 characters or fewer."),
  email,
  password,
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const forgotPasswordSchema = z.object({ email });

export const newPasswordSchema = z
  .object({
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don't match." });

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don't match." })
  .refine((v) => v.password !== v.current, { path: ["password"], message: "Choose a different password from your current one." });

export const displayNameSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(60, "Use 60 characters or fewer."),
});

export type FieldErrors = Partial<Record<string, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function formValues(formData: FormData, keys: readonly string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
}

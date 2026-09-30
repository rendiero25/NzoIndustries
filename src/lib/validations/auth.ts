import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
  password: z.string().min(1, { message: "Password wajib diisi" }),
});

export const registerSchema = z
  .object({
    first_name: z
      .string()
      .min(1, { message: "Nama depan wajib diisi" })
      .max(50, { message: "Nama depan maksimal 50 karakter" }),
    last_name: z
      .string()
      .min(1, { message: "Nama belakang wajib diisi" })
      .max(50, { message: "Nama belakang maksimal 50 karakter" }),
    phone: z
      .string()
      .min(10, { message: "Nomor telepon minimal 10 digit" })
      .max(20, { message: "Nomor telepon terlalu panjang" })
      .regex(/^[0-9+\-\s()]+$/, {
        message: "Nomor telepon hanya boleh angka, spasi, +, -, atau tanda kurung",
      }),
    email: z.string().email({ message: "Email tidak valid" }),
    password: z
      .string()
      .min(8, { message: "Password minimal 8 karakter" })
      .regex(/[A-Z]/, { message: "Password harus mengandung huruf besar" })
      .regex(/[0-9]/, { message: "Password harus mengandung angka" }),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirm_password"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: "Password minimal 8 karakter" })
      .regex(/[A-Z]/, { message: "Password harus mengandung huruf besar" })
      .regex(/[0-9]/, { message: "Password harus mengandung angka" }),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirm_password"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

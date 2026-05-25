import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  name: z.string().min(1, 'Tên không được để trống').max(120),
  phone: z.string().max(20).optional(),
});

export const signInSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  avatar: z.string().url('URL không hợp lệ').max(2048).nullable().optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

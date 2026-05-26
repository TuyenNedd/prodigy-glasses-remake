'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, type SignInInput } from '@prodigy/shared-types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

import { apiPost } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface SignInResponse {
  user: { id: string; email: string; name: string; role: string };
  accessToken: string;
}

export default function SignInPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInInput) => {
    setServerError(null);
    try {
      const res = await apiPost<SignInResponse>('/auth/sign-in', data);
      setAuth(res.accessToken, res.user);
      router.push('/');
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string };
      if (error.code === 'invalid_credentials') {
        setServerError('Invalid email or password.');
      } else {
        setServerError(error.message || 'Something went wrong. Please try again.');
      }
    }
  };

  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-bold">Sign In</h1>

      {serverError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="w-full rounded border px-3 py-2 text-sm focus:border-black focus:outline-none"
            placeholder="you@example.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            {...register('password')}
            className="w-full rounded border px-3 py-2 text-sm focus:border-black focus:outline-none"
            placeholder="Your password"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-black py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <Link href="/sign-up" className="font-medium text-black hover:underline">
          Sign Up
        </Link>
      </p>
    </>
  );
}

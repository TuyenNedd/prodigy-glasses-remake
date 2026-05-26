'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, type SignUpInput } from '@prodigy/shared-types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

import { apiPost } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface SignUpResponse {
  user: { id: string; email: string; name: string; role: string };
  accessToken: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpInput) => {
    setServerError(null);
    try {
      const res = await apiPost<SignUpResponse>('/auth/sign-up', data);
      setAuth(res.accessToken, res.user);
      router.push('/');
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string };
      if (error.code === 'email_already_registered') {
        setServerError('This email is already registered.');
      } else {
        setServerError(error.message || 'Something went wrong. Please try again.');
      }
    }
  };

  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-bold">Create Account</h1>

      {serverError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className="w-full rounded border px-3 py-2 text-sm focus:border-black focus:outline-none"
            placeholder="Your full name"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

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
            placeholder="At least 8 characters"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium">
            Phone (optional)
          </label>
          <input
            id="phone"
            type="tel"
            {...register('phone')}
            className="w-full rounded border px-3 py-2 text-sm focus:border-black focus:outline-none"
            placeholder="+84 901 234 567"
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-black py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-medium text-black hover:underline">
          Sign In
        </Link>
      </p>
    </>
  );
}

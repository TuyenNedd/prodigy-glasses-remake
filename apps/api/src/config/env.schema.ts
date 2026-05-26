import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USERNAME: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_DATABASE: z.string().default('prodigy_glasses'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32).default('dev-access-secret-change-in-production-32chars'),
  JWT_REFRESH_SECRET: z.string().min(32).default('dev-refresh-secret-change-in-production-32chr'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Bcrypt
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).default(10),

  // PayPal
  PAYPAL_CLIENT_ID: z.string().default('sandbox-client-id'),
  PAYPAL_CLIENT_SECRET: z.string().default('sandbox-client-secret'),
  PAYPAL_BASE_URL: z.string().default('https://api-m.sandbox.paypal.com'),
  PAYPAL_WEBHOOK_ID: z.string().default('sandbox-webhook-id'),
  USD_VND_RATE: z.coerce.number().default(24000),

  // CORS
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const formatted = result.error.format();
    const message = Object.entries(formatted)
      .filter(([key]) => key !== '_errors')
      .map(([key, val]) => `  ${key}: ${(val as { _errors: string[] })._errors.join(', ')}`)
      .join('\n');

    throw new Error(`❌ Environment validation failed:\n${message}`);
  }
  return result.data;
}

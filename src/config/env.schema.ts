import { z } from 'zod';

export const envSchema = z.object({
	PORT: z.coerce.number().int().positive().default(3000),
	NODE_ENV: z
		.enum(['development', 'test', 'production'])
		.default('development'),

	OIDC_ISSUER_URL: z.url({
		message: 'OIDC_ISSUER_URL must be a valid URL',
	}),
	OIDC_CLIENT_ID: z.string().min(1, {
		message: 'OIDC_CLIENT_ID is required',
	}),
	OIDC_CLIENT_SECRET: z.string().optional(),
	OIDC_JWKS_URL: z.url().optional(),

	DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

	BUCKET_ENDPOINT: z.url().optional(),
	BUCKET_NAME: z.string().optional(),
	BUCKET_ACCESS_KEY_ID: z.string().optional(),
	BUCKET_SECRET_ACCESS_KEY: z.string().optional(),
	BUCKET_REGION: z.string().default('us-east-1'),

	LOG_LEVEL: z
		.enum(['error', 'warn', 'info', 'debug', 'verbose'])
		.default('info'),
	ENABLE_REQUEST_LOGGING: z.coerce.boolean().default(true),
});

export type Env = z.infer<typeof envSchema>;

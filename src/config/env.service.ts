import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

@Injectable()
export class EnvService {
	constructor(private readonly config: ConfigService<Env, true>) {}

	get port(): number {
		return this.config.get('PORT', { infer: true });
	}

	get nodeEnv(): 'development' | 'test' | 'production' {
		return this.config.get('NODE_ENV', { infer: true });
	}

	get isDevelopment(): boolean {
		return this.nodeEnv === 'development';
	}

	get isProduction(): boolean {
		return this.nodeEnv === 'production';
	}

	get oidcIssuerUrl(): string {
		return this.config.get('OIDC_ISSUER_URL', { infer: true });
	}

	get oidcClientId(): string {
		return this.config.get('OIDC_CLIENT_ID', { infer: true });
	}

	get oidcClientSecret(): string | undefined {
		return this.config.get('OIDC_CLIENT_SECRET', { infer: true });
	}

	get oidcJwksUrl(): string | undefined {
		return this.config.get('OIDC_JWKS_URL', { infer: true });
	}

	get bucketEndpoint(): string | undefined {
		return this.config.get('BUCKET_ENDPOINT', { infer: true });
	}

	get bucketName(): string | undefined {
		return this.config.get('BUCKET_NAME', { infer: true });
	}

	get bucketAccessKeyId(): string | undefined {
		return this.config.get('BUCKET_ACCESS_KEY_ID', { infer: true });
	}

	get bucketSecretAccessKey(): string | undefined {
		return this.config.get('BUCKET_SECRET_ACCESS_KEY', { infer: true });
	}

	get bucketRegion(): string {
		return this.config.get('BUCKET_REGION', { infer: true });
	}

	get logLevel(): string {
		return this.config.get('LOG_LEVEL', { infer: true });
	}

	get enableRequestLogging(): boolean {
		return this.config.get('ENABLE_REQUEST_LOGGING', { infer: true });
	}
}

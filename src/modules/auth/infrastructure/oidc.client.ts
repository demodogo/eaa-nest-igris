import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { OidcClientPort } from '../application/ports/oidc-client.port';
import { JwksClient } from 'jwks-rsa';
import { EnvService } from '@/config/env.service';
import { UserClaims } from '../domain/user-claims';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class OidcClient implements OidcClientPort {
	private readonly logger = new Logger(OidcClient.name);
	private readonly jwksClient: JwksClient;

	constructor(private readonly envService: EnvService) {
		const jwksUrl =
			this.envService.oidcJwksUrl ||
			`${this.envService.oidcIssuerUrl}/protocol/openid-connect/certs`;

		this.jwksClient = new JwksClient({
			jwksUri: jwksUrl,
			cache: true,
			cacheMaxAge: 1000 * 60 * 15,
			rateLimit: true,
			jwksRequestsPerMinute: 10,
		});

		this.logger.log(`OIDC client initialized with JWKS URL ${jwksUrl}`);
	}

	async validateToken(token: string): Promise<UserClaims> {
		const decoded = jwt.decode(token, { complete: true });

		if (!decoded) {
			throw new UnauthorizedException('Invalid token format');
		}

		const kid = decoded.header.kid;
		if (!kid) {
			throw new UnauthorizedException('Token missing key id (kid)');
		}

		try {
			const key = await this.jwksClient.getSigningKey(kid);
			const publicKey = key.getPublicKey();

			const verified = jwt.verify(token, publicKey, {
				issuer: this.envService.oidcIssuerUrl,
				clockTolerance: 30,
				algorithms: ['RS256'],
			});
			return this.mapClaimsToUserClaims(verified);
		} catch (error) {
			this.logger.warn(`Token validation failed: ${error.message}`);
			throw new UnauthorizedException('Invalid or expired token');
		}
	}

	async getJwks(): Promise<any> {
		return this.jwksClient.getSigningKeys();
	}

	private mapClaimsToUserClaims(claims: any): UserClaims {
		return {
			userId: claims.sub,
			email: claims.email,
			emailVerified: claims.email_verified || false,
			name: claims.name,
			givenName: claims.given_name,
			familyName: claims.family_name,
			preferredUsername: claims.preferred_username,
			roles: claims.realm_access?.roles || [],
			issuer: claims.iss,
			subject: claims.sub,
			issuedAt: claims.iat,
			expiresAt: claims.exp,
		};
	}
}

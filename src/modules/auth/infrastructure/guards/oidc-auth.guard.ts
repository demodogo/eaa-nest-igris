import {
	CanActivate,
	ExecutionContext,
	Inject,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import type { OidcClientPort } from '../../application/ports/oidc-client.port';
import { OIDC_CLIENT_PORT } from '../../application/ports/oidc-client.port';
import { Reflector } from '@nestjs/core';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class OidcAuthGuard implements CanActivate {
	constructor(
		@Inject(OIDC_CLIENT_PORT) private readonly oidcClient: OidcClientPort,
		private readonly reflector: Reflector,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			return true;
		}

		const request = context.switchToHttp().getRequest();
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			throw new UnauthorizedException('Missing Authorization header');
		}

		const [scheme, token] = authHeader.split(' ');

		if (scheme !== 'Bearer' || !token) {
			throw new UnauthorizedException('Invalid Authorization header format');
		}

		try {
			request.user = await this.oidcClient.validateToken(token);
			return true;
		} catch (error) {
			throw new UnauthorizedException('Invalid or expired token');
		}
	}
}

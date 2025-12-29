import { UserClaims } from '../../domain/user-claims';

export interface OidcClientPort {
	validateToken(token: string): Promise<UserClaims>;

	getJwks(): Promise<any>;
}

export const OIDC_CLIENT_PORT = Symbol('OIDC_CLIENT_PORT');

export interface UserClaims {
	userId: string;
	email: string;
	emailVerified: boolean;
	name?: string;
	givenName?: string;
	familyName?: string;
	preferredUsername?: string;
	roles: string[];
	issuer: string;
	subject: string;
	issuedAt: number;
	expiresAt: number;
}

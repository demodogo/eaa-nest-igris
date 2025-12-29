import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { OidcClient } from './infrastructure/oidc.client';
import { OidcAuthGuard } from './infrastructure/guards/oidc-auth.guard';
import { MeController } from './interface/controllers/me.controller';
import { OIDC_CLIENT_PORT } from './application/ports/oidc-client.port';

@Module({
	controllers: [MeController],
	providers: [
		{
			provide: OIDC_CLIENT_PORT,
			useClass: OidcClient,
		},
		{
			provide: APP_GUARD,
			useClass: OidcAuthGuard,
		},
	],
	exports: [OIDC_CLIENT_PORT],
})
export class AuthModule {}

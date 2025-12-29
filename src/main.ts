import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { EnvService } from './config/env.service';

async function bootstrap() {
	const logger = new Logger('Bootstrap');

	const app = await NestFactory.create(AppModule, {
		logger: ['error', 'warn', 'log', 'debug', 'verbose'],
	});

	const envService = app.get(EnvService);

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			transformOptions: {
				enableImplicitConversion: true,
			},
		}),
	);

	app.enableCors({
		origin: envService.isDevelopment ? '*' : ['https://app.example.com'],
		credentials: true,
	});

	if (envService.isDevelopment) {
		const config = new DocumentBuilder()
			.setTitle('Accreditation Management API')
			.setDescription('Enterprise accreditation and access control system')
			.setVersion('1.0.0')
			.addBearerAuth()
			.build();

		const document = SwaggerModule.createDocument(app, config);
		SwaggerModule.setup('api/docs', app, document);

		logger.log('📚 Swagger documentation available at /api/docs');
	}

	const port = envService.port;
	await app.listen(port);

	logger.log(`🚀 Application running on port ${port}`);
	logger.log(`🌍 Environment: ${envService.nodeEnv}`);
	logger.log(`🔐 OIDC Issuer: ${envService.oidcIssuerUrl}`);
}

bootstrap();

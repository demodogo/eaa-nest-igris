import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './env.schema';
import { EnvService } from './env.service';

@Global()
@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ['.env.local', '.env'],
			cache: true,
			expandVariables: true,
			validate: (config) => {
				try {
					return envSchema.parse(config);
				} catch (error) {
					console.error('Environment validation failed');
					console.error(error);
					throw new Error('Invalid environment configuration');
				}
			},
		}),
	],
	providers: [EnvService],
	exports: [EnvService],
})
export class EnvModule {}

import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { EnvService } from '@/config/env.service';
import { HealthResponseDto } from './dto/health-response.dto';
import { Public } from '@/shared/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
	private readonly startTime: number;

	constructor(private readonly envService: EnvService) {
		this.startTime = Date.now();
	}

	@Get()
	@ApiOperation({
		summary: 'Health check endpoint',
		description: 'Returns app health status and metadata',
	})
	@ApiResponse({
		status: 200,
		description: 'Health check successful',
		type: HealthResponseDto,
	})
	health(): HealthResponseDto {
		return {
			ok: true,
			version: process.env.npm_package_version || '1.0.0',
			environment: this.envService.nodeEnv,
			timestamp: new Date().toISOString(),
			uptime: Math.floor((Date.now() - this.startTime) / 1000),
		};
	}
}

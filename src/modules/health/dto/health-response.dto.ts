import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
	@ApiProperty({
		description: 'Health status indicator',
		example: true,
	})
	ok: boolean;

	@ApiProperty({
		description: 'Application version',
		example: '1.0.0',
	})
	version: string;

	@ApiProperty({
		description: 'Current environment',
		example: 'development',
	})
	environment: string;

	@ApiProperty({
		description: 'Server timestamp',
		example: '2025-12-29T04:47:00.000Z',
	})
	timestamp: string;

	@ApiProperty({
		description: 'Service uptime (seconds)',
		example: 3600,
	})
	uptime: number;
}

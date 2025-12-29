import { ApiProperty } from '@nestjs/swagger';

/**
 * User information response DTO
 */
export class UserInfoDto {
	@ApiProperty({
		description: 'Unique user identifier',
		example: '123e4567-e89b-12d3-a456-426614174000',
	})
	userId: string;

	@ApiProperty({
		description: 'User email address',
		example: 'user@example.com',
	})
	email: string;

	@ApiProperty({
		description: 'Email verification status',
		example: true,
	})
	emailVerified: boolean;

	@ApiProperty({
		description: 'User full name',
		example: 'John Doe',
		required: false,
	})
	name?: string;

	@ApiProperty({
		description: 'Preferred username',
		example: 'johndoe',
		required: false,
	})
	preferredUsername?: string;

	@ApiProperty({
		description: 'Assigned roles',
		example: ['user', 'admin'],
		type: [String],
	})
	roles: string[];
}

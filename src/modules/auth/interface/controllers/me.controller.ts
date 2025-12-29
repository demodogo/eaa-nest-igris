import { Controller, Get, UseGuards } from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger';
import { OidcAuthGuard } from '../../infrastructure/guards/oidc-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import type { UserClaims } from '../../domain/user-claims';
import { UserInfoDto } from '../dto/user-info.dto';

@ApiTags('Authentication')
@Controller('me')
@UseGuards(OidcAuthGuard)
@ApiBearerAuth()
export class MeController {
	@Get()
	@ApiOperation({
		summary: 'Get current user information',
		description: 'Returns authenticated user claims from validated JWT',
	})
	@ApiResponse({
		status: 200,
		description: 'User information retrieved successfully',
		type: UserInfoDto,
	})
	@ApiResponse({
		status: 401,
		description: 'Unauthorized - Invalid or missing token',
	})
	getCurrentUser(@CurrentUser() user: UserClaims): UserInfoDto {
		return {
			userId: user.userId,
			email: user.email,
			emailVerified: user.emailVerified,
			name: user.name,
			preferredUsername: user.preferredUsername,
			roles: user.roles,
		};
	}
}

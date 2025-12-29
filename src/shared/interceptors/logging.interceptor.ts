import {
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EnvService } from '@/config/env.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger(LoggingInterceptor.name);

	constructor(private readonly envService: EnvService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		if (!this.envService.enableRequestLogging) {
			return next.handle();
		}

		const request = context.switchToHttp().getRequest();
		const { method, url, ip } = request;
		const userAgent = request.get('user-agent') || '';
		const startTime = Date.now();

		this.logger.log(`→ ${method} ${url} - ${ip} - ${userAgent}`);

		return next.handle().pipe(
			tap({
				next: () => {
					const response = context.switchToHttp().getResponse();
					const { statusCode } = response;
					const duration = Date.now() - startTime;
					this.logger.log(`← ${method} ${url} ${statusCode} - ${duration}ms`);
				},
				error: (error) => {
					const duration = Date.now() - startTime;
					this.logger.error(
						`← ${method} ${url} ${error.status || 500} - ${duration}ms - ${error.message}`,
					);
				},
			}),
		);
	}
}

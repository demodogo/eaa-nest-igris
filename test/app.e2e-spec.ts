import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Application (e2e)', () => {
	let app: INestApplication<App>;

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		await app.init();
	});

	afterEach(async () => {
		await app.close();
	});

	describe('/health (GET)', () => {
		it('should return health status', () => {
			return request(app.getHttpServer())
				.get('/health')
				.expect(200)
				.expect((res) => {
					expect(res.body).toHaveProperty('ok', true);
					expect(res.body).toHaveProperty('timestamp');
					expect(res.body).toHaveProperty('environment');
					expect(res.body).toHaveProperty('uptime');
					expect(res.body).toHaveProperty('version');
				});
		});
	});
});

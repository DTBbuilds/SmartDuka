import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

/**
 * Root-route smoke test.
 *
 * Deliberately does NOT boot the full AppModule: the original scaffold
 * imported AppModule (requiring a live MongoDB) and asserted the NestJS
 * scaffold response ('Hello World!') that no longer exists. The real root
 * contract is a JSON status document served by AppController/AppService,
 * which have no database dependencies.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) returns the API status document', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          name: 'SmartDuka API',
          status: 'running',
        });
        expect(typeof res.body.timestamp).toBe('string');
      });
  });

  it('/ (HEAD) responds 200 with no body', async () => {
    await request(app.getHttpServer()).head('/').expect(200);
  });
});

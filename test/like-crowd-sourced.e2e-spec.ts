import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SignInDto } from '../src/auth/dto/signin.dto';
import { CreateCrowdSourcingDto } from '../src/crowd-sourcing/dto/create-crowd-sourcing.dto';
import { CreateEventLikeDto } from '../src/like/dto/create-event-like.dto';

describe('Like Crowd Sourced Event (e2e)', () => {
  let app: INestApplication;
  let customerToken = '';
  let crowdSourceId = '';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.setGlobalPrefix('/api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Signin', () => {
    test('(POST) => Should login for customer', () => {
      const customer: SignInDto = {
        email: 'test2@gmail.com',
        password: '12345678',
      };
      return request(app.getHttpServer())
        .post('/api/v1/auth/signin/customer')
        .send(customer)
        .expect(200)
        .then((res) => {
          expect(res.body.access_token).toBeDefined();
          customerToken = res.body.access_token;
        });
    });
  });

  describe('Crowd Sourcing', () => {
    test('(POST) => Should create crowd sourced event', () => {
      const dto: CreateCrowdSourcingDto = {
        name: 'Test Crowd Event',
        description: 'Test Description',
        address: 'Test Address',
        category: 'Test Category',
        tag: 'Event',
        images: [],
        isFree: true
      };
      return request(app.getHttpServer())
        .post('/api/v1/crowd-sourcing')
        .set('Authorization', 'Bearer ' + customerToken)
        .send(dto)
        .expect(201)
        .then((res) => {
          expect(res.body.id).toBeDefined();
          crowdSourceId = res.body.id;
        });
    });
  });

  describe('Like Crowd Sourced Event Toggle', () => {
    test('(POST) => Should like the crowd sourced event', () => {
      const dto: CreateEventLikeDto = {
        eventId: crowdSourceId,
      };
      return request(app.getHttpServer())
        .post('/api/v1/likes/crowd-sourced')
        .set('Authorization', 'Bearer ' + customerToken)
        .send(dto)
        .expect(201)
        .then((res) => {
          expect(res.body.message).toBe('Crowd sourced liked');
          expect(res.body.like).toBeDefined();
        });
    });

    test('(POST) => Should unlike the crowd sourced event (toggle)', () => {
      const dto: CreateEventLikeDto = {
        eventId: crowdSourceId,
      };
      return request(app.getHttpServer())
        .post('/api/v1/likes/crowd-sourced')
        .set('Authorization', 'Bearer ' + customerToken)
        .send(dto)
        .expect(201)
        .then((res) => {
          expect(res.body.message).toBe('Crowd sourced unliked');
          expect(res.body.like).toBeNull();
        });
    });

    test('(POST) => Should like the crowd sourced event again (toggle back)', () => {
      const dto: CreateEventLikeDto = {
        eventId: crowdSourceId,
      };
      return request(app.getHttpServer())
        .post('/api/v1/likes/crowd-sourced')
        .set('Authorization', 'Bearer ' + customerToken)
        .send(dto)
        .expect(201)
        .then((res) => {
          expect(res.body.message).toBe('Crowd sourced liked');
          expect(res.body.like).toBeDefined();
        });
    });
  });
});

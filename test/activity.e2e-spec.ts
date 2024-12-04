import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { SignInDto } from '../src/auth/dto/signin.dto';
import { SignUpDto } from '../src/auth/dto/signup.dto';
import {
  CreateActivitiesDto,
  UpdateActivitiesDto,
} from '../src/activities/dto';

describe('Activity (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerToken = '';
  let moderatorToken = '';
  let id = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.setGlobalPrefix('/api/v1');
    await app.init();
    await app.listen(3334);
    prisma = app.get(PrismaService);
    await prisma.cleanDb();
  });

  afterAll(() => app.close());

  describe('Auth', () => {
    describe('Signup', () => {
      // testing for signup with valid data
      it('(POST) => Should register a new user', () => {
        const customer: SignUpDto = {
          name: 'E2E Test1',
          email: 'test1@gmail.com',
          password: '123456',
          phone_number: '',
          address: '',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup')
          .send(customer)
          .expect(201)
          .then((res) => expect(res.body.access_token).toBeDefined());
      });
    });

    describe('Signin', () => {
      // testing for customer login
      test('(POST) => Should login for customer', () => {
        const customer: SignInDto = {
          email: 'test1@gmail.com',
          password: '123456',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin')
          .send(customer)
          .expect(200)
          .then((res) => {
            expect(res.body.access_token).toBeDefined();
            customerToken = res.body.access_token;
          });
      });

      // testing for moderator login
      test('(POST) => Should login for moderator', () => {
        const moderator: SignInDto = {
          email: process.env.SEED_USER_EMAIL,
          password: process.env.SEED_PASSWORD,
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin')
          .send(moderator)
          .expect(200)
          .then((res) => {
            expect(res.body.access_token).toBeDefined();
            moderatorToken = res.body.access_token;
          });
      });
    });
  });

  describe('Activities', () => {
    describe('Create Activity', () => {
      const activity: CreateActivitiesDto = <any>{
        name: 'Mountain Hiking',
        description:
          'Experience the breathtaking views and fresh air while hiking through the beautiful mountain trails.',
        capacity: 15,
        address: '123 Mountain Rd, Adventure Town, AT 12345',
        amenities: ['Guided Tour', 'Snacks', 'First Aid Kit'],
        images: [
          'https://example.com/images/mountain_hiking_1.jpg',
          'https://example.com/images/mountain_hiking_2.jpg',
        ],
      };

      // testing for creating activity with customer authenticated
      it('(POST) => Should not create activity with customer authenticated', () => {
        return request(app.getHttpServer())
          .post('/api/v1/activities')
          .set('Authorization', 'Bearer ' + customerToken)
          .send(activity)
          .expect(403);
      });

      // testing for creating activity with moderator authenticated
      it('(POST) => Should create activity with moderator authenticated', () => {
        return request(app.getHttpServer())
          .post('/api/v1/activities')
          .set('Authorization', 'Bearer ' + moderatorToken)
          .send(activity)
          .expect(201)
          .then((res) => expect(res.body.id).toBeDefined());
      });
    });

    describe('Get Activities', () => {
      // testing for finding all activities with customer authenticated
      it('(GET) => Should find activities with customer authentication', () => {
        return request(app.getHttpServer())
          .get('/api/v1/activities')
          .set('Authorization', 'Bearer ' + customerToken)
          .expect(200)
          .then((res) => expect(res.body[0].id).toBeDefined());
      });

      // testing for finding all activities with moderator authenticated
      it('(GET) => Should find activities with moderator authentication', () => {
        return request(app.getHttpServer())
          .get('/api/v1/activities')
          .set('Authorization', 'Bearer ' + moderatorToken)
          .expect(200)
          .then((res) => {
            expect(res.body[0].id).toBeDefined();
            id = res.body[0].id;
          });
      });
    });

    describe('Get One Activity By ID', () => {
      // testing for finding one activity with customer authenticated
      it('(GET) => Should find one activity by id with customer authentication', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/activities/${id}`)
          .set('Authorization', 'Bearer ' + customerToken)
          .expect(200)
          .then((res) => expect(res.body.id).toBeDefined());
      });

      // testing for finding one activity with moderator authenticated
      it('(GET) => Should find one activity by id with moderator authentication', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/activities/${id}`)
          .set('Authorization', 'Bearer ' + moderatorToken)
          .expect(200)
          .then((res) => expect(res.body.id).toBeDefined());
      });
    });

    describe('Update Activity', () => {
      const activity: UpdateActivitiesDto = { capacity: 20 };

      // testing for updating activity with customer authenticated
      it('(PATCH) => Should not update activity with customer authenticated', () => {
        return request(app.getHttpServer())
          .patch(`/api/v1/activities/${id}`)
          .set('Authorization', 'Bearer ' + customerToken)
          .send(activity)
          .expect(403);
      });

      // testing for updating activity with moderator authenticated
      it('(PATCH) => Should update activity with moderator authenticated', () => {
        return request(app.getHttpServer())
          .patch(`/api/v1/activities/${id}`)
          .set('Authorization', 'Bearer ' + moderatorToken)
          .send(activity)
          .expect(200)
          .then((res) => expect(res.body.id).toBeDefined());
      });
    });

    describe('Delete Activity', () => {
      // testing for deleting activity with customer authenticated
      it('(PATCH) => Should not delete activity with customer authenticated', () => {
        return request(app.getHttpServer())
          .patch(`/api/v1/activities/${id}`)
          .set('Authorization', 'Bearer ' + customerToken)
          .expect(403);
      });

      // testing for deleting activity with moderator authenticated
      it('(PATCH) => Should delete activity with moderator authenticated', () => {
        return request(app.getHttpServer())
          .patch(`/api/v1/activities/${id}`)
          .set('Authorization', 'Bearer ' + moderatorToken)
          .expect(200)
          .then((res) => expect(res.body.id).toBeDefined());
      });
    });
  });
});

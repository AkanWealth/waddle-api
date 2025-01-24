import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { SignInDto } from '../src/auth/dto/signin.dto';
import { UserSignUpDto } from '../src/auth/dto/user-signup.dto';
import { VendorSignUpDto } from '../src/auth/dto/vendor-signup.dto';
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
      // testing for customer signup
      it('(POST) => Should register a new customer', () => {
        const customer: UserSignUpDto = {
          name: 'E2E Test2',
          email: 'test2@gmail.com',
          password: '12345678',
          phone_number: '',
          address: '',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup/customer')
          .send(customer)
          .expect(201);
      });

      // testing for vendor signup
      it('(POST) => Should register a new vendor', () => {
        const vendor: VendorSignUpDto = {
          name: 'E2E Vendor1',
          email: 'vendor2@gmail.com',
          password: '12345678',
          address: '12B Cresent Maryland',
          business_name: 'Mr Bigs',
          business_category: 'Hospitality',
          registration_number: 's#kA6uA1LkTt[5P',
          phone_number: '080123456789',
          business_url: 'https://xample.co.uk',
          facebook_url: 'https://facebook.com/xample-co-uk',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup/vendor')
          .send(vendor)
          .expect(201);
      });
    });

    describe('Signin', () => {
      // testing for customer login
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

      // testing for vendor login
      test('(POST) => Should login for vendor', () => {
        const vendor: SignInDto = {
          email: 'vendor2@gmail.com',
          password: '12345678',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin/vendor')
          .send(vendor)
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
        price: 200,
        address: '123 Mountain Rd, Adventure Town, AT 12345',
        total_ticket: 20,
        date: '2025-03-26',
        time: '11:30:00',
        age_range: '6-10',
        instruction: 'Parent supervision is required',
      };

      // testing for creating activity with customer authenticated
      it('(POST) => Should not create activity with customer authenticated', () => {
        return request(app.getHttpServer())
          .post('/api/v1/activities')
          .set('Authorization', 'Bearer ' + customerToken)
          .send(activity)
          .expect(403);
      });

      // testing for creating activity with vendor authenticated
      it('(POST) => Should create activity with vendor authenticated', () => {
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
      const activity: UpdateActivitiesDto = { price: 50 };

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

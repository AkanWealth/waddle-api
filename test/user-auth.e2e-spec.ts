import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { SignInDto } from '../src/auth/dto/signin.dto';
import { UpdateUserDto } from '../src/user/dto/update-user.dto';
import { UserSignUpDto } from '../src/auth/dto/user-signup.dto';

describe('Authentication and User (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtToken = '';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.setGlobalPrefix('/api/v1');
    await app.init();
    await app.listen(3333);
    prisma = app.get(PrismaService);
    await prisma.cleanDb();
  });

  afterAll(() => app.close());

  describe('Auth', () => {
    describe('Signup', () => {
      // testing for signup with valid data
      it('(POST) => Should register a new user', () => {
        const user: UserSignUpDto = {
          name: 'E2E Test1',
          email: 'test1@gmail.com',
          password: '12345678',
          phone_number: '',
          address: '',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup/customer')
          .send(user)
          .expect(201);
      });

      // testing for signup with an email
      it('(POST) => Should not Register a new user with existing email', () => {
        const user: UserSignUpDto = {
          name: 'E2E Test1',
          email: 'test1@gmail.com',
          password: '12345678',
          phone_number: '',
          address: '',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup/customer')
          .send(user)
          .expect(400);
      });

      // testing for signup without an email
      it('Should not signup without an email', () => {
        const user: UserSignUpDto = {
          name: 'E2E Test2',
          email: '',
          password: '12345678',
          phone_number: '',
          address: '',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup/customer')
          .send(user)
          .expect(400);
      });

      // testing for signup without a password
      it('Should not signup without a password', () => {
        const user: UserSignUpDto = {
          name: 'E2E Test2',
          email: 'test2@gmail.com',
          password: '',
          phone_number: '',
          address: '',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup/customer')
          .send(user)
          .expect(400);
      });
    });

    describe('Signin', () => {
      // testing for no email
      test('(POST) => Should not login without email', () => {
        const user: SignInDto = {
          email: '',
          password: '12345678',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin/customer')
          .send(user)
          .expect(400);
      });

      // testing for no password
      test('(POST) => Should not login without a password', () => {
        const user: SignInDto = {
          email: 'test1@gmail.com',
          password: '',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin/customer')
          .send(user)
          .expect(400);
      });

      // testing for wrong email
      test('(POST) => Should not login without a matching email', () => {
        const user: SignInDto = {
          email: 'test@gmail.com',
          password: '12345678',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin/customer')
          .send(user)
          .expect(401);
      });

      // testing for wrong password
      test('(POST) => Should not login without a matching password', () => {
        const user: SignInDto = {
          email: 'test1@gmail.com',
          password: '12345578',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin/customer')
          .send(user)
          .expect(401);
      });

      // testing for correct credentials
      test('(POST) => Should login with right credentials', () => {
        const user: SignInDto = {
          email: 'test1@gmail.com',
          password: '12345678',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin/customer')
          .send(user)
          .expect(200)
          .then((res) => {
            expect(res.body.access_token).toBeDefined();
            jwtToken = res.body.access_token;
          });
      });
    });
  });

  describe('User', () => {
    describe('GetUser', () => {
      // testing for getting current user data without authentication
      it('(GET) => Should not find current user without authentication', () => {
        return request(app.getHttpServer()).get('/api/v1/users/me').expect(400);
      });

      // testing for getting current user data with authentication
      it('(GET) => Should find current user with authentication', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users/me')
          .set('Authorization', 'Bearer ' + jwtToken)
          .expect(200)
          .then((res) => expect(res.body.id).toBeDefined());
      });
    });

    describe('UpdateUser', () => {
      // testing for updating current user data without authentication
      it('(PATCH) => Should not update current user without authentication', () => {
        const user: UpdateUserDto = {
          name: 'Test One',
          email: 'test1@gmail.com',
          password: '@dmin1.',
        };
        return request(app.getHttpServer())
          .patch('/api/v1/users/me')
          .send(user)
          .expect(400);
      });

      // testing for updating current user data with authentication
      it('(PATCH) => Should update current user with authentication', () => {
        const user: UpdateUserDto = {
          name: 'Test One',
          email: 'test1@gmail.com',
          password: '12345678.',
        };
        return request(app.getHttpServer())
          .patch('/api/v1/users/me')
          .set('Authorization', 'Bearer ' + jwtToken)
          .send(user)
          .expect(202)
          .then((res) => expect(res.body.name).toEqual(user.name));
      });
    });
  });
});

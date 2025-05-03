import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SignInDto, OrganiserSignUpDto } from '../src/auth/dto';
import { UpdateOrganiserDto } from '../src/organiser/dto';

/**
 * @group organiser
 * @depends app
 */
describe('Authentication and Organiser (e2e)', () => {
  let app: INestApplication;
  let jwtToken = '';

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.setGlobalPrefix('/api/v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Auth', () => {
    describe('Signup', () => {
      // testing for signup with valid data
      it('(POST) => Should register a new organiser', () => {
        const organiser: OrganiserSignUpDto = {
          name: 'E2E Organiser1',
          email: 'organiser1@gmail.com',
          password: '12345678',
          phone_number: '+23480123456789',
          address: '12B Cresent Maryland',
          business_name: 'Organiser1 Business',
          business_category: 'Hospitality',
          registration_number: 's#kA6uA1LkTt[5P',
          website_url: 'https://xample.co.uk',
          facebook_url: 'https://facebook.com/xample-co-uk',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup/organiser')
          .send(organiser)
          .expect(201);
      });

      // testing for signup without an email
      it('Should not signup without an email', () => {
        const organiser: OrganiserSignUpDto = {
          name: 'E2E Organiser1',
          email: '',
          password: '12345678',
          phone_number: '+23480123456789',
          address: '12B Cresent Maryland',
          registration_number: '',
          business_name: 'Organiser1 Business',
          business_category: 'Hospitality',
          website_url: 'https://xample.co.uk',
          facebook_url: 'https://facebook.com/xample-co-uk',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup/organiser')
          .send(organiser)
          .expect(400);
      });

      // testing for signup without a password
      it('Should not signup without a password', () => {
        const organiser: OrganiserSignUpDto = {
          name: 'E2E Organiser1',
          email: 'organiser2@gmail.com',
          password: '',
          phone_number: '+23480123456789',
          address: '12B Cresent Maryland',
          business_name: 'Organiser1 Business',
          business_category: 'Hospitality',
          registration_number: '',
          website_url: 'https://xample.co.uk',
          facebook_url: 'https://facebook.com/xample-co-uk',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup/organiser')
          .send(organiser)
          .expect(400);
      });

      // testing for signup without a registration number
      it('Should not signup without a registration number', () => {
        const organiser: OrganiserSignUpDto = {
          name: 'E2E Organiser1',
          email: 'organiser2@gmail.com',
          password: '12345678',
          phone_number: '+23480123456789',
          address: '12B Cresent Maryland',
          business_name: 'Organiser1 Business',
          business_category: 'Hospitality',
          registration_number: '',
          website_url: 'https://xample.co.uk',
          facebook_url: 'https://facebook.com/xample-co-uk',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup/organiser')
          .send(organiser)
          .expect(400);
      });

      // testing for signup with an existing email
      it('(POST) => Should not Register a new organiser with existing email', () => {
        const organiser: OrganiserSignUpDto = {
          name: 'E2E Organiser1',
          email: 'organiser1@gmail.com',
          password: '12345678',
          phone_number: '+23480123456789',
          address: '12B Cresent Maryland',
          business_name: 'Organiser1 Business',
          business_category: 'Hospitality',
          registration_number: '',
          website_url: 'https://xample.co.uk',
          facebook_url: 'https://facebook.com/xample-co-uk',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup/organiser')
          .send(organiser)
          .expect(400);
      });
    });

    describe('Signin', () => {
      // testing for no email
      test('(POST) => Should not login without email', () => {
        const organiser: SignInDto = {
          email: '',
          password: '12345678',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin/organiser')
          .send(organiser)
          .expect(400);
      });

      // testing for no password
      test('(POST) => Should not login without a password', () => {
        const organiser: SignInDto = {
          email: 'organiser1@gmail.com',
          password: '',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin/organiser')
          .send(organiser)
          .expect(400);
      });

      // testing for wrong email
      test('(POST) => Should not login without a matching email', () => {
        const organiser: SignInDto = {
          email: 'organiser@gmail.com',
          password: '12345678',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin/organiser')
          .send(organiser)
          .expect(401);
      });

      // testing for wrong password
      test('(POST) => Should not login without a matching password', () => {
        const organiser: SignInDto = {
          email: 'organiser1@gmail.com',
          password: '12345578',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin/organiser')
          .send(organiser)
          .expect(401);
      });

      // testing for correct credentials
      test('(POST) => Should login with right credentials', () => {
        const organiser: SignInDto = {
          email: 'organiser1@gmail.com',
          password: '12345678',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin/organiser')
          .send(organiser)
          .expect(200)
          .then((res) => {
            expect(res.body.access_token).toBeDefined();
            jwtToken = res.body.access_token;
          });
      });
    });
  });

  describe('Organiser', () => {
    describe('GetOrganiser', () => {
      // testing for getting current organiser data without authentication
      it('(GET) => Should not find current organiser without authentication', () => {
        return request(app.getHttpServer())
          .get('/api/v1/organisers/me')
          .expect(401);
      });

      // testing for getting current organiser data with authentication
      it('(GET) => Should find current organiser with authentication', () => {
        return request(app.getHttpServer())
          .get('/api/v1/organisers/me')
          .set('Authorization', 'Bearer ' + jwtToken)
          .expect(200)
          .then((res) => expect(res.body.id).toBeDefined());
      });
    });

    describe('UpdateOrganiser', () => {
      // testing for updating current organiser data without authentication
      it('(PATCH) => Should not update current organiser without authentication', () => {
        const organiser: UpdateOrganiserDto = {
          name: 'Organiser One',
          email: 'organiser1@gmail.com',
          password: 'Organiser123.',
          email_verify: true,
          isVerified: true,
        };
        return request(app.getHttpServer())
          .patch('/api/v1/organisers/me')
          .send(organiser)
          .expect(401);
      });

      // testing for updating current organiser data with authentication
      it('(PATCH) => Should update current organiser with authentication', () => {
        const organiser: UpdateOrganiserDto = {
          name: 'Organiser One',
          email: 'organiser1@gmail.com',
          password: 'Organiser123.',
          email_verify: true,
          isVerified: true,
        };
        return request(app.getHttpServer())
          .patch('/api/v1/organisers/me')
          .set('Authorization', 'Bearer ' + jwtToken)
          .send(organiser)
          .expect(202)
          .then((res) => {
            expect(res.body.email_verify).toEqual(organiser.email_verify);
            expect(res.body.isVerified).toEqual(organiser.isVerified);
          });
      });
    });
  });
});

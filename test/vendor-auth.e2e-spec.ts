import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { SignInDto, VendorSignUpDto } from '../src/auth/dto';
import { UpdateVendorDto } from '../src/vendor/dto';

describe('Authentication and Vendor (e2e)', () => {
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
      it('(POST) => Should register a new vendor', () => {
        const vendor: VendorSignUpDto = {
          name: 'E2E Vendor1',
          email: 'vendor1@gmail.com',
          password: '12345678',
          phone_number: '+23480123456789',
          address: '12B Cresent Maryland',
          business_name: 'Vendor1 Business',
          business_category: 'Hospitality',
          registration_number: 's#kA6uA1LkTt[5P',
          business_url: 'https://xample.co.uk',
          facebook_url: 'https://facebook.com/xample-co-uk',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup/vendor')
          .send(vendor)
          .expect(201);
      });

      // testing for signup without an email
      it('Should not signup without an email', () => {
        const vendor: VendorSignUpDto = {
          name: 'E2E Vendor1',
          email: '',
          password: '12345678',
          phone_number: '+23480123456789',
          address: '12B Cresent Maryland',
          registration_number: '',
          business_name: 'Vendor1 Business',
          business_category: 'Hospitality',
          business_url: 'https://xample.co.uk',
          facebook_url: 'https://facebook.com/xample-co-uk',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup/vendor')
          .send(vendor)
          .expect(400);
      });

      // testing for signup without a password
      it('Should not signup without a password', () => {
        const vendor: VendorSignUpDto = {
          name: 'E2E Vendor1',
          email: 'vendor2@gmail.com',
          password: '',
          phone_number: '+23480123456789',
          address: '12B Cresent Maryland',
          business_name: 'Vendor1 Business',
          business_category: 'Hospitality',
          registration_number: '',
          business_url: 'https://xample.co.uk',
          facebook_url: 'https://facebook.com/xample-co-uk',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup/vendor')
          .send(vendor)
          .expect(400);
      });

      // testing for signup without a registration number
      it('Should not signup without a registration number', () => {
        const vendor: VendorSignUpDto = {
          name: 'E2E Vendor1',
          email: 'vendor2@gmail.com',
          password: '12345678',
          phone_number: '+23480123456789',
          address: '12B Cresent Maryland',
          business_name: 'Vendor1 Business',
          business_category: 'Hospitality',
          registration_number: '',
          business_url: 'https://xample.co.uk',
          facebook_url: 'https://facebook.com/xample-co-uk',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup/vendor')
          .send(vendor)
          .expect(400);
      });

      // testing for signup with an existing email
      it('(POST) => Should not Register a new vendor with existing email', () => {
        const vendor: VendorSignUpDto = {
          name: 'E2E Vendor1',
          email: 'vendor1@gmail.com',
          password: '12345678',
          phone_number: '+23480123456789',
          address: '12B Cresent Maryland',
          business_name: 'Vendor1 Business',
          business_category: 'Hospitality',
          registration_number: '',
          business_url: 'https://xample.co.uk',
          facebook_url: 'https://facebook.com/xample-co-uk',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signup/vendor')
          .send(vendor)
          .expect(400);
      });
    });

    describe('Signin', () => {
      // testing for no email
      test('(POST) => Should not login without email', () => {
        const vendor: SignInDto = {
          email: '',
          password: '12345678',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin/vendor')
          .send(vendor)
          .expect(400);
      });

      // testing for no password
      test('(POST) => Should not login without a password', () => {
        const vendor: SignInDto = {
          email: 'vendor1@gmail.com',
          password: '',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin/vendor')
          .send(vendor)
          .expect(400);
      });

      // testing for wrong email
      test('(POST) => Should not login without a matching email', () => {
        const vendor: SignInDto = {
          email: 'vendor@gmail.com',
          password: '12345678',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin/vendor')
          .send(vendor)
          .expect(401);
      });

      // testing for wrong password
      test('(POST) => Should not login without a matching password', () => {
        const vendor: SignInDto = {
          email: 'vendor1@gmail.com',
          password: '12345578',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin/vendor')
          .send(vendor)
          .expect(401);
      });

      // testing for correct credentials
      test('(POST) => Should login with right credentials', () => {
        const vendor: SignInDto = {
          email: 'vendor1@gmail.com',
          password: '12345678',
        };
        return request(app.getHttpServer())
          .post('/api/v1/auth/signin/vendor')
          .send(vendor)
          .expect(200)
          .then((res) => {
            expect(res.body.access_token).toBeDefined();
            jwtToken = res.body.access_token;
          });
      });
    });
  });

  describe('Vendor', () => {
    describe('GetVendor', () => {
      // testing for getting current vendor data without authentication
      it('(GET) => Should not find current vendor without authentication', () => {
        return request(app.getHttpServer())
          .get('/api/v1/vendors/me')
          .expect(400);
      });

      // testing for getting current vendor data with authentication
      it('(GET) => Should find current vendor with authentication', () => {
        return request(app.getHttpServer())
          .get('/api/v1/vendors/me')
          .set('Authorization', 'Bearer ' + jwtToken)
          .expect(200)
          .then((res) => expect(res.body.id).toBeDefined());
      });
    });

    describe('UpdateVendor', () => {
      // testing for updating current vendor data without authentication
      it('(PATCH) => Should not update current vendor without authentication', () => {
        const vendor: UpdateVendorDto = {
          name: 'Vendor One',
          email: 'vendor1@gmail.com',
          password: 'Vendor123.',
          email_verify: true,
          business_verify: true,
        };
        return request(app.getHttpServer())
          .patch('/api/v1/vendors/me')
          .send(vendor)
          .expect(400);
      });

      // testing for updating current vendor data with authentication
      it('(PATCH) => Should update current vendor with authentication', () => {
        const vendor: UpdateVendorDto = {
          name: 'Vendor One',
          email: 'vendor1@gmail.com',
          password: 'Vendor123.',
          email_verify: true,
          business_verify: true,
        };
        return request(app.getHttpServer())
          .patch('/api/v1/vendors/me')
          .set('Authorization', 'Bearer ' + jwtToken)
          .send(vendor)
          .expect(202)
          .then((res) => {
            expect(res.body.email_verify).toEqual(vendor.email_verify);
            expect(res.body.business_verify).toEqual(vendor.business_verify);
          });
      });
    });
  });
});

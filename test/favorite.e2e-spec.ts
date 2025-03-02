import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SignInDto } from '../src/auth/dto/signin.dto';
import { CreateFavoriteDto } from '../src/favorite/dto/create-favorite.dto';
import { CreateEventDto } from '../src/event/dto/create-event.dto';

/**
 * @group favorite
 * @depends event
 */
describe('Favorite (e2e)', () => {
  let app: INestApplication;
  let customerToken = '';
  let vendorToken = '';
  let eventID = '';
  let id = '';

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
          vendorToken = res.body.access_token;
        });
    });
  });

  describe('Event', () => {
    const event: CreateEventDto = <any>{
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
      category: 'Outing',
    };

    // testing for creating an event
    test('(POST) => Should create event with vendor authenticated', () => {
      return request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', 'Bearer ' + vendorToken)
        .send(event)
        .expect(201)
        .then((res) => expect(res.body.id).toBeDefined());
    });

    // testing for getting an event
    test('(GET) => Should get an event with customer authenticated', () => {
      return request(app.getHttpServer())
        .get('/api/v1/events')
        .set('Authorization', 'Bearer ' + customerToken)
        .expect(200)
        .then((res) => {
          expect(res.body[0].id).toBeDefined();
          eventID = res.body[0].id;
        });
    });
  });

  describe('Favorite', () => {
    describe('Create favorite', () => {
      // testing for creating favorite with customer authenticated
      it('(POST) => Should create favorite with customer authenticated', () => {
        const event: CreateFavoriteDto = {
          eventId: eventID,
        };
        return request(app.getHttpServer())
          .post('/api/v1/favorites')
          .set('Authorization', 'Bearer ' + customerToken)
          .send(event)
          .expect(201)
          .then((res) => {
            expect(res.body.id).toBeDefined();
          });
      });

      // testing for creating favorite without customer authentication
      it('(POST) => Should not create favorite without authentication', () => {
        const event: CreateFavoriteDto = {
          eventId: eventID,
        };
        return request(app.getHttpServer())
          .post('/api/v1/favorites')
          .send(event)
          .expect(401);
      });
    });

    describe('Get favorite', () => {
      // testing for finding all favorites with customer authenticated
      it('(GET) => Should find favorites with customer authentication', () => {
        return request(app.getHttpServer())
          .get('/api/v1/favorites')
          .set('Authorization', 'Bearer ' + customerToken)
          .expect(200)
          .then((res) => expect(res.body[0].id).toBeDefined());
      });

      // testing for finding all favorites without authentication
      it('(GET) => Should not find favorites without authentication', () => {
        return request(app.getHttpServer())
          .get('/api/v1/favorites')
          .expect(401);
      });
    });

    describe('Get one favorite by ID', () => {
      // testing for finding one favorite with customer authenticated
      it('(GET) => Should find one favorite by id with customer authentication', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/favorites/${id}`)
          .set('Authorization', 'Bearer ' + customerToken)
          .expect(200)
          .then((res) => {
            expect(res.body[0].id).toBeDefined();
            id = res.body[0].id;
          });
      });

      // testing for finding one favorite without authentication
      it('(GET) => Should not find one favorite by id without authentication', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/favorites/${id}`)
          .expect(401);
      });
    });

    describe('Delete favorite', () => {
      // testing for deleting favorite without customer authenticated
      it('(DELETE) => Should not delete favorite without customer authenticated', () => {
        return request(app.getHttpServer())
          .delete(`/api/v1/favorites/${id}`)
          .expect(401);
      });

      // testing for deleting favorite with customer authenticated
      it('(DELETE) => Should delete favorite with customer authenticated', () => {
        return request(app.getHttpServer())
          .delete(`/api/v1/favorites/${id}`)
          .set('Authorization', 'Bearer ' + customerToken)
          .expect(204);
      });
    });
  });
});

import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SignInDto } from '../src/auth/dto/signin.dto';
import { CreateEventDto } from '../src/event/dto/create-event.dto';
import { CreateLikeDto } from '../src/like/dto/create-like.dto';

/**
 * @group like
 * @depends event
 */
describe('Favorite (e2e)', () => {
  let app: INestApplication;
  let customerToken = '';
  let organiserToken = '';
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

    // testing for organiser login
    test('(POST) => Should login for organiser', () => {
      const organiser: SignInDto = {
        email: 'organiser2@gmail.com',
        password: '12345678',
      };
      return request(app.getHttpServer())
        .post('/api/v1/auth/signin/organiser')
        .send(organiser)
        .expect(200)
        .then((res) => {
          expect(res.body.access_token).toBeDefined();
          organiserToken = res.body.access_token;
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
    test('(POST) => Should create event with organiser authenticated', () => {
      return request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', 'Bearer ' + organiserToken)
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

  describe('Like', () => {
    describe('Create like', () => {
      // testing for creating likes with customer authenticated
      it('(POST) => Should create likes with customer authenticated', async () => {
        const like: CreateLikeDto = {
          eventId: eventID,
        };
        return await request(app.getHttpServer())
          .post('/api/v1/likes')
          .set('Authorization', 'Bearer ' + customerToken)
          .send(like)
          .expect(201)
          .then((res) => {
            expect(res.body.id).toBeDefined();
            id = res.body.id;
          });
      });

      // testing for creating likes without customer authentication
      it('(POST) => Should not create likes without authentication', () => {
        const like: CreateLikeDto = {
          eventId: eventID,
        };
        return request(app.getHttpServer())
          .post('/api/v1/likes')
          .send(like)
          .expect(401);
      });
    });

    describe('Get likes', () => {
      // testing for finding likes based on event with customer authenticated
      it('(GET) => Should find likes based on event with customer authentication', async () => {
        return await request(app.getHttpServer())
          .get(`/api/v1/likes/${eventID}`)
          .set('Authorization', 'Bearer ' + customerToken)
          .expect(200)
          .then((res) => expect(res.body[0].id).toBeDefined());
      });

      // testing for finding likes based on event without authentication
      it('(GET) => Should not find likes based on events without authentication', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/likes/${eventID}`)
          .expect(401);
      });
    });

    describe('Delete like', () => {
      // testing for deleting like without customer authenticated
      it('(DELETE) => Should not like without customer authenticated', () => {
        return request(app.getHttpServer())
          .delete(`/api/v1/likes/${id}`)
          .expect(401);
      });

      // testing for deleting like with customer authenticated
      it('(DELETE) => Should delete like with customer authenticated', () => {
        return request(app.getHttpServer())
          .delete(`/api/v1/likes/${id}`)
          .set('Authorization', 'Bearer ' + customerToken)
          .expect(204);
      });
    });
  });
});

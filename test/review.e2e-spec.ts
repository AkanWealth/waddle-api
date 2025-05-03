import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SignInDto } from '../src/auth/dto/signin.dto';
import { CreateReviewDto } from '../src/review/dto/create-review.dto';
import { CreateEventDto } from '../src/event/dto/create-event.dto';

/**
 * @group review
 * @depends event
 */
describe('Review (e2e)', () => {
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

  describe('Review', () => {
    describe('Create review', () => {
      // testing for creating review with customer authenticated
      it('(POST) => Should create review with customer authenticated', async () => {
        const review: CreateReviewDto = {
          name: '',
          rating: 5,
          comment: 'Such a wonderful event',
          eventId: eventID,
        };
        return await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Authorization', 'Bearer ' + customerToken)
          .send(review)
          .expect(201)
          .then((res) => {
            expect(res.body.id).toBeDefined();
          });
      });

      // testing for creating review without customer authentication
      it('(POST) => Should not create review without authentication', () => {
        const review: CreateReviewDto = {
          name: '',
          rating: 5,
          comment: 'Such a wonderful event',
          eventId: eventID,
        };
        return request(app.getHttpServer())
          .post('/api/v1/reviews')
          .send(review)
          .expect(401);
      });
    });

    describe('Get review', () => {
      // testing for finding reviews based on event with customer authenticated
      it('(GET) => Should find reviews based on event with customer authentication', async () => {
        return await request(app.getHttpServer())
          .get(`/api/v1/reviews/${eventID}`)
          .set('Authorization', 'Bearer ' + customerToken)
          .expect(200)
          .then((res) => {
            expect(res.body[0].id).toBeDefined();
            id = res.body[0].id;
          });
      });

      // testing for finding reviews based on event without authentication
      it('(GET) => Should not find reviews based on event without authentication', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/reviews/${eventID}`)
          .expect(401);
      });
    });

    describe('Get one review by ID', () => {
      // testing for finding one review with customer authenticated
      it('(GET) => Should find one review by id with customer authentication', async () => {
        return await request(app.getHttpServer())
          .get(`/api/v1/reviews/${id}`)
          .set('Authorization', 'Bearer ' + customerToken)
          .expect(200)
          .then((res) => {
            expect(res.body.id).toBeDefined();
          })
          .catch((err) => console.log(err.message));
      });

      // testing for finding one review without authentication
      it('(GET) => Should not find one review by id without authentication', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/reviews/${id}`)
          .expect(401);
      });
    });
  });
});

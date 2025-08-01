import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { setupRedoc } from './middleware';
import { Express } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: true,
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://localhost:3030',
        'https://waddle-admin.vercel.app',
        'https://waddle-admn.vercel.app',
        'https://waddleapp.io',
        'https://www.waddleapp.io',
      ],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    },
  });

  // Configure Express body parser with larger limits for file uploads
  const expressApp = app.getHttpAdapter().getInstance() as Express;

  // Configure body parser limits for large file uploads
  expressApp.use((req, res, next) => {
    // Set larger limits for file uploads
    req.setTimeout(300000); // 5 minutes timeout
    next();
  });

  // Enhanced CORS handling with better debugging
  expressApp.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:3030',
      'https://waddle-admin.vercel.app',
      'https://waddle-admn.vercel.app',
      'https://waddleapp.io',
      'https://www.waddleapp.io',
    ];

    // Log CORS requests for debugging
    console.log('CORS Request:', {
      method: req.method,
      origin: origin,
      url: req.url,
      headers: req.headers,
    });

    if (origin && allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
    } else {
      res.set('Access-Control-Allow-Origin', '*');
    }

    res.set(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );
    res.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Accept',
    );
    res.set('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Configure body parser with larger limits
  expressApp.use((req, res, next) => {
    // Increase payload size limit to 50MB for file uploads
    const originalSend = res.send;
    res.send = function (data) {
      res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.set(
        'Access-Control-Allow-Methods',
        'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      );
      res.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, Accept',
      );
      res.set('Access-Control-Allow-Credentials', 'true');
      return originalSend.call(this, data);
    };
    next();
  });

  app.setGlobalPrefix('/api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // setting up swagger ui documentation
  const config = new DocumentBuilder()
    .setTitle('Waddle App API')
    .setDescription(
      `This application provides a multi-role system with distinct functionalities for administrators, guardians, and orgarnisers:

      - Admin Management: Administrators can manage the entire system, including user roles (sub-admins, orgarnisers, guardians), and events.  They can also create admin and sub-admin accounts, and sign in/out.

      - Guardian Management: Guardians can create accounts (via email/password or SSO), sign in, and manage their profiles.

      - Orgarniser Management: Orgarnisers can create accounts, sign in, manage their profiles, create and manage events, and invite staff.

      - Event Management: Orgarnisers, orgarniser staffs, and admins can create and update events, with guardians able to view published events.  Event creation includes the ability to save drafts.
      
      - Booking Management: Organisers, organiser staffs, and admin can view bookings, with guardians able to book for a published event.`,
    )
    .setExternalDoc('Redoc Documenation', '/docs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });
  SwaggerModule.setup('/', app, document, {
    swaggerOptions: {
      docExpansion: 'none',
      // defaultModelsExpandDepth: -1,
      persistAuthorization: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
    customfavIcon: 'https://avatars.githubusercontent.com/u/6936373?s=200&v=4',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.css',
    ],
  });

  // Expose Swagger JSON at `/api-json`
  app.use('/api-json', (req: any, res: any) => {
    res.json(document);
  });

  // Set up ReDoc at `/docs`
  setupRedoc(app as any);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running...`);
}
bootstrap();

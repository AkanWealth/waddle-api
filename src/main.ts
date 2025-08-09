import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { setupRedoc } from './middleware';
import { Express } from 'express';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false, // Disable built-in body parser to configure custom limits
  });

  // Get Express instance
  const expressApp = app.getHttpAdapter().getInstance() as Express;

  // Configure body parser with larger limits FIRST (before CORS)
  expressApp.use('/api/v1/uploads', express.json({ limit: '50mb' }));
  expressApp.use(
    '/api/v1/uploads',
    express.urlencoded({ limit: '50mb', extended: true }),
  );
  expressApp.use('/api/v1/uploads', express.raw({ limit: '50mb' }));

  // Configure general body parser for other routes
  expressApp.use(express.json({ limit: '10mb' }));
  expressApp.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Set timeout for large file uploads
  expressApp.use('/api/v1/uploads', (req, res, next) => {
    req.setTimeout(600000); // 10 minutes timeout for uploads
    res.setTimeout(600000);
    next();
  });

  // Enhanced CORS middleware - MUST be before routes
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

    // Always set CORS headers
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else if (origin) {
      // For debugging - log unrecognized origins
      console.log('Unrecognized origin:', origin);
      res.header('Access-Control-Allow-Origin', origin); // Allow it anyway for debugging
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }

    res.header(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Origin,X-Requested-With,Content-Type,Accept,Authorization',
    );
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }

    next();
  });

  // Apply NestJS built-in CORS as backup
  app.enableCors({
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
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
    ],
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix('/api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger documentation setup
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
    .setExternalDoc('Redoc Documentation', '/docs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });

  SwaggerModule.setup('/', app, document, {
    swaggerOptions: {
      docExpansion: 'none',
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
  expressApp.get('/api-json', (req, res) => {
    res.json(document);
  });

  // Set up ReDoc at `/docs`
  setupRedoc(app as any);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on port ${port}...`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
});

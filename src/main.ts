import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { setupRedoc } from './middleware';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configure CORS FIRST - before any other middleware
  app.enableCors({
    origin: (origin, callback) => {
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

      // Allow requests with no origin (mobile apps, postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log('CORS blocked origin:', origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma',
    ],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Configure Express settings for large file uploads
  app.useBodyParser('json', { limit: '50mb' });
  app.useBodyParser('urlencoded', { limit: '50mb', extended: true });
  app.useBodyParser('raw', { limit: '50mb' });

  // Set global prefix
  app.setGlobalPrefix('/api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Add debugging middleware to log all requests
  app.use((req: any, res: any, next: any) => {
    console.log(`${req.method} ${req.url}`, {
      origin: req.headers.origin,
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      userAgent: req.headers['user-agent']?.substring(0, 50),
    });

    // Set timeout for upload requests
    if (req.url.includes('/uploads')) {
      req.setTimeout(300000); // 5 minutes
      res.setTimeout(300000);
    }

    next();
  });

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

  // Expose Swagger JSON
  app.use('/api-json', (req: any, res: any) => {
    res.json(document);
  });

  // Set up ReDoc
  setupRedoc(app as any);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on port ${port}...`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

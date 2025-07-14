import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { setupRedoc } from './middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: true,
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:3030',
        'https://waddle-admin.vercel.app',
        'https://waddle-admn-k3a9.vercel.app',
      ],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      preflightContinue: false,
      optionsSuccessStatus: 204,
    },
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

import { Express } from 'express';
import redoc from 'redoc-express';

export function setupRedoc(app: Express) {
  const redocOptions = {
    title: 'Waddle API',
    version: '1.0',
    specUrl: '/api-json',
  };

  app.use('/docs', redoc(redocOptions));
}

import { Express } from 'express';
import redoc from 'redoc-express';

export function setupRedoc(app: Express) {
  const redocOptions = {
    title: 'Waddle API',
    version: '1.0',
    specUrl: '/api-json',
    sortTagsAlphabetically: true,
    sortOperationsAlphabetically: true,
    logo: {
      url: 'https://cdn-1.webcatalog.io/catalog/redocly/redocly-icon-filled-256.png?v=1714779963559',
      backgroundColor: '#fff',
      altText: 'Waddle Logo',
      href: 'https://waddleapp.io',
    },
  };

  app.use('/docs', redoc(redocOptions));
}

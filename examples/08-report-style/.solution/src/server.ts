// The catalog API. Express 5, static data, no database.
//
// createApp takes no arguments and reads nothing from disk. The data is a
// module import, so two requests always return the same bytes.

import express, { type Express, type Request, type Response } from 'express';

import { CATEGORIES, PRODUCTS } from './catalog';

export function createApp(): Express {
  const app = express();

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'catalog' });
  });

  app.get('/api/categories', (_req: Request, res: Response) => {
    res.json(CATEGORIES);
  });

  app.get('/api/products', (req: Request, res: Response) => {
    const category = typeof req.query.category === 'string' ? req.query.category : null;
    const products = category ? PRODUCTS.filter((p) => p.category === category) : PRODUCTS;
    res.json(products);
  });

  app.get('/api/products/:id', (req: Request, res: Response) => {
    const product = PRODUCTS.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(product);
  });

  // Every other path, including the root.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'not_found' });
  });

  return app;
}

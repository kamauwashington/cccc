// The catalog API. Static data in, JSON out. Nothing here touches a database
// or the filesystem, so every request sees the same bytes.

import express from 'express';
import type { Express, Request, Response } from 'express';

import { CATEGORIES, PRODUCTS } from './catalog.js';

export function createApp(): Express {
  const app = express();

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'catalog' });
  });

  app.get('/api/categories', (_req: Request, res: Response) => {
    res.json(CATEGORIES);
  });

  app.get('/api/products', (req: Request, res: Response) => {
    const category = req.query.category;
    if (typeof category === 'string') {
      res.json(PRODUCTS.filter((product) => product.category === category));
      return;
    }
    res.json(PRODUCTS);
  });

  app.get('/api/products/:id', (req: Request, res: Response) => {
    const product = PRODUCTS.find((candidate) => candidate.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(product);
  });

  // Every other path, every other method.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'not_found' });
  });

  return app;
}

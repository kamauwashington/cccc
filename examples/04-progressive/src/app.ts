import express from 'express';
import type { Express } from 'express';
import { ordersRouter } from './orders/routes.js';
import { paymentsRouter } from './payments/routes.js';
import { fulfillmentRouter } from './fulfillment/routes.js';
import { notificationsRouter } from './notifications/routes.js';

export function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/orders', ordersRouter);
  app.use('/payments', paymentsRouter);
  app.use('/shipments', fulfillmentRouter);
  app.use('/notifications', notificationsRouter);
  return app;
}

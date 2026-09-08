import { Router } from 'express';
import type { Request, Response } from 'express';
import { OrderError } from './service.js';
import * as orders from './service.js';

export const ordersRouter: Router = Router();

function fail(res: Response, error: unknown): void {
  if (error instanceof OrderError) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(500).json({ error: 'unexpected' });
}

ordersRouter.get('/', (_req: Request, res: Response) => {
  res.json({ orders: orders.listOrders() });
});

ordersRouter.post('/', (req: Request, res: Response) => {
  try {
    res.status(201).json(orders.createOrder(req.body));
  } catch (error) {
    fail(res, error);
  }
});

ordersRouter.get('/:id', (req: Request, res: Response) => {
  try {
    res.json(orders.getOrder(String(req.params.id)));
  } catch (error) {
    fail(res, error);
  }
});

ordersRouter.post('/:id/pay', (req: Request, res: Response) => {
  try {
    res.json(orders.markPaid(String(req.params.id)));
  } catch (error) {
    fail(res, error);
  }
});

ordersRouter.post('/:id/cancel', (req: Request, res: Response) => {
  try {
    res.json(orders.cancelOrder(String(req.params.id)));
  } catch (error) {
    fail(res, error);
  }
});

ordersRouter.get('/:id/next-statuses', (req: Request, res: Response) => {
  try {
    const order = orders.getOrder(String(req.params.id));
    res.json({ from: order.status, to: orders.allowedNextStatuses(order.status) });
  } catch (error) {
    fail(res, error);
  }
});

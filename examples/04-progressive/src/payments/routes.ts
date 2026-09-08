import { Router } from 'express';
import type { Request, Response } from 'express';
import { PaymentError } from './service.js';
import * as payments from './service.js';

export const paymentsRouter: Router = Router();

function fail(res: Response, error: unknown): void {
  const status = error instanceof PaymentError ? 400 : 500;
  res.status(status).json({ error: error instanceof Error ? error.message : 'unexpected' });
}

paymentsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { orderId, amountCents } = req.body as { orderId: string; amountCents: number };
    res.status(201).json(payments.authorizePayment(orderId, amountCents));
  } catch (error) {
    fail(res, error);
  }
});

paymentsRouter.post('/:id/capture', (req: Request, res: Response) => {
  try {
    res.json(payments.capturePayment(String(req.params.id)));
  } catch (error) {
    fail(res, error);
  }
});

paymentsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    res.json(payments.getPayment(String(req.params.id)));
  } catch (error) {
    fail(res, error);
  }
});

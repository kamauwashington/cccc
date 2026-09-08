import { Router } from 'express';
import type { Request, Response } from 'express';
import { FulfillmentError } from './service.js';
import * as fulfillment from './service.js';
import { Carrier } from './types.js';

export const fulfillmentRouter: Router = Router();

function fail(res: Response, error: unknown): void {
  const status = error instanceof FulfillmentError ? 400 : 500;
  res.status(status).json({ error: error instanceof Error ? error.message : 'unexpected' });
}

fulfillmentRouter.post('/', (req: Request, res: Response) => {
  try {
    const { orderId, carrier } = req.body as { orderId: string; carrier?: Carrier };
    res.status(201).json(fulfillment.createShipment(orderId, carrier));
  } catch (error) {
    fail(res, error);
  }
});

fulfillmentRouter.post('/:id/advance', (req: Request, res: Response) => {
  try {
    res.json(fulfillment.advance(String(req.params.id)));
  } catch (error) {
    fail(res, error);
  }
});

fulfillmentRouter.get('/:id', (req: Request, res: Response) => {
  try {
    res.json(fulfillment.getShipment(String(req.params.id)));
  } catch (error) {
    fail(res, error);
  }
});

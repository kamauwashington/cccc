import { Router } from 'express';
import type { Request, Response } from 'express';
import { NotificationError } from './service.js';
import * as notifications from './service.js';
import type { Channel, NotificationKind } from './types.js';

export const notificationsRouter: Router = Router();

notificationsRouter.get('/', (_req: Request, res: Response) => {
  res.json({ outbox: notifications.outbox() });
});

notificationsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { kind, orderId, to, channel } = req.body as {
      kind: NotificationKind;
      orderId: string;
      to: string;
      channel?: Channel;
    };
    res.status(201).json(notifications.notify(kind, orderId, to, channel));
  } catch (error) {
    const status = error instanceof NotificationError ? 400 : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'unexpected' });
  }
});

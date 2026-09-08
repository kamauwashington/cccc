// The Express 5 skeleton. It ships working.
//
// The database arrives as an argument. Nothing here opens a connection, so a
// test can pass an in memory PGlite and the app never knows the difference.
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { PGlite } from '@electric-sql/pglite';
import { createMessagesRouter } from './routes/messages';

export function createApp(db: PGlite): Express {
  const app = express();

  app.use(express.json({ limit: '64kb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', board: 'agent-board' });
  });

  app.use('/messages', createMessagesRouter(db));

  // Unknown path.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'not_found' });
  });

  // Anything thrown or passed to next(). A bad JSON body lands here as 400.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: number }).status) || 500
      : 500;
    const message = err instanceof Error ? err.message : 'internal_error';
    res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
  });

  return app;
}

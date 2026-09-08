// Black Mamba owns this file. This is a stub.
//
// It answers 501 to everything, so the app still boots and the skeleton tests
// still pass. Replace the whole body with the three handlers. The agent prompt
// in .claude/agents/black-mamba.md has the details.
import { Router, type Request, type Response } from 'express';
import type { PGlite } from '@electric-sql/pglite';

export function createMessagesRouter(_db: PGlite): Router {
  const router = Router();
  router.use((_req: Request, res: Response) => {
    res.status(501).json({ error: 'not_implemented' });
  });
  return router;
}

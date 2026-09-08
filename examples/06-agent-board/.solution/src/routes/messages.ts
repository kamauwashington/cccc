// Black Mamba's file. Three handlers, one resource, no cleverness.
//
// The database comes in as an argument. The router never reaches for a global.
import { Router, type Request, type Response } from 'express';
import type { PGlite } from '@electric-sql/pglite';
import { createMessageSchema, toMessageDto, type MessageRow } from '../schema/messages';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createMessagesRouter(db: PGlite): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const parsed = createMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
      return;
    }
    const { kind, author, body } = parsed.data;
    const result = await db.query<MessageRow>(
      `INSERT INTO messages (kind, author, body)
       VALUES ($1, $2, $3)
       RETURNING id, kind, author, body, created_at`,
      [kind, author, body]
    );
    res.status(201).json(toMessageDto(result.rows[0]!));
  });

  router.get('/', async (req: Request, res: Response) => {
    const limitRaw = Number(req.query.limit ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200) : 50;
    const result = await db.query<MessageRow>(
      `SELECT id, kind, author, body, created_at
         FROM messages
        ORDER BY created_at DESC
        LIMIT $1`,
      [limit]
    );
    res.json({ messages: result.rows.map(toMessageDto) });
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    if (!UUID_RE.test(id)) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const result = await db.query<MessageRow>(
      `SELECT id, kind, author, body, created_at FROM messages WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    if (!row) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(toMessageDto(row));
  });

  return router;
}

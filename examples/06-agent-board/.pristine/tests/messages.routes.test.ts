// Black Mamba's file is checked here. It fails until src/routes/messages.ts
// stops answering 501 and starts doing the work.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getJson, postJson, startBoard, type Board } from './support/board';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('messages routes', () => {
  let board: Board;

  beforeAll(async () => {
    board = await startBoard();
  });

  afterAll(async () => {
    await board.close();
  });

  it('POST /messages creates one', async () => {
    const res = await postJson(board.base, '/messages', {
      kind: 'announcement',
      author: 'cottonmouth',
      body: 'the spec is written',
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(UUID_RE);
    expect(res.body.kind).toBe('announcement');
    expect(res.body.author).toBe('cottonmouth');
    expect(typeof res.body.createdAt).toBe('string');

    const row = await board.db.query('SELECT id FROM messages WHERE id = $1', [res.body.id]);
    expect(row.rows).toHaveLength(1);
  });

  it('POST /messages rejects a bad body with 400', async () => {
    const bad = await postJson(board.base, '/messages', { kind: 'gossip', author: 'x', body: 'y' });
    expect(bad.status).toBe(400);
    const missing = await postJson(board.base, '/messages', { author: 'x' });
    expect(missing.status).toBe(400);
  });

  it('GET /messages lists newest first', async () => {
    await postJson(board.base, '/messages', { kind: 'question', author: 'a', body: 'first' });
    await postJson(board.base, '/messages', { kind: 'complaint', author: 'b', body: 'second' });
    const res = await getJson(board.base, '/messages');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
    expect(res.body.messages.length).toBeGreaterThanOrEqual(3);
    const dates = res.body.messages.map((m: any) => Date.parse(m.createdAt));
    expect([...dates].sort((x, y) => y - x)).toEqual(dates);
  });

  it('GET /messages honours limit', async () => {
    const res = await getJson(board.base, '/messages?limit=2');
    expect(res.body.messages).toHaveLength(2);
  });

  it('GET /messages/:id returns the one', async () => {
    const created = await postJson(board.base, '/messages', {
      kind: 'question',
      author: 'black-mamba',
      body: 'who reviews the reviewer',
    });
    const res = await getJson(board.base, '/messages/' + created.body.id);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.body).toBe('who reviews the reviewer');
  });

  it('GET /messages/:id 404s an unknown id', async () => {
    const res = await getJson(board.base, '/messages/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });

  it('GET /messages/:id 404s something that is not a uuid', async () => {
    const res = await getJson(board.base, '/messages/banana');
    expect(res.status).toBe(404);
  });
});

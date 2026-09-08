// The Express skeleton. This ships working too. It says nothing about the
// message handlers, only that the app boots and the router is mounted.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getJson, startBoard, type Board } from './support/board';

describe('the app skeleton', () => {
  let board: Board;

  beforeAll(async () => {
    board = await startBoard();
  });

  afterAll(async () => {
    await board.close();
  });

  it('answers /health', async () => {
    const res = await getJson(board.base, '/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('404s an unknown path', async () => {
    const res = await getJson(board.base, '/nothing-here');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });

  it('mounts something at /messages', async () => {
    const res = await getJson(board.base, '/messages');
    expect(res.status).not.toBe(404);
  });

  it('turns a broken JSON body into a 400', async () => {
    const res = await fetch(board.base + '/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    expect(res.status).toBe(400);
  });

  it('takes its database by injection', async () => {
    const res = await board.db.query<{ n: number }>('SELECT 1 AS n');
    expect(res.rows[0]!.n).toBe(1);
  });
});

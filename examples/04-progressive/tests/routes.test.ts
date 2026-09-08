import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { resetOrders } from '../src/orders/service.js';
import { OrderStatus } from '../src/orders/types.js';

let server: Server;
let base = '';

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  resetOrders();
});

async function post(path: string, body: unknown = {}): Promise<Response> {
  return fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('the http surface', () => {
  it('answers /health', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('creates and reads an order', async () => {
    const created = await post('/orders', {
      customerId: 'cus_1',
      lines: [{ sku: 'widget', quantity: 1, unitPrice: 2500 }],
    });
    expect(created.status).toBe(201);
    const order = (await created.json()) as { id: string; totalCents: number };
    expect(order.totalCents).toBe(2500);

    const fetched = await fetch(`${base}/orders/${order.id}`);
    expect(fetched.status).toBe(200);
  });

  it('maps a bad transition to 400', async () => {
    const created = await post('/orders', {
      customerId: 'cus_1',
      lines: [{ sku: 'widget', quantity: 1, unitPrice: 2500 }],
    });
    const order = (await created.json()) as { id: string };
    await post(`/orders/${order.id}/cancel`);
    const res = await post(`/orders/${order.id}/cancel`);
    expect(res.status).toBe(400);
  });

  it('refunds a paid order over http', async () => {
    const created = await post('/orders', {
      customerId: 'cus_1',
      lines: [{ sku: 'widget', quantity: 1, unitPrice: 2500 }],
    });
    const order = (await created.json()) as { id: string };
    await post(`/orders/${order.id}/pay`);
    const res = await post(`/orders/${order.id}/refund`, { amountCents: 500 });
    expect(res.status).toBe(200);
    const refunded = (await res.json()) as { status: string; refundedCents: number };
    expect(refunded.status).toBe(OrderStatus.Refunded);
    expect(refunded.refundedCents).toBe(500);
  });
});

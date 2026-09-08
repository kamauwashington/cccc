import { beforeEach, describe, expect, it } from 'vitest';
import { OrderStatus, seedData, ordersFor, type Database } from '../src/db/store.js';
import {
  OrderError,
  OrderService,
  canTransition,
  refundableMinor,
  totalsByCurrency,
} from '../src/orders/service.js';

let db: Database;
let service: OrderService;

beforeEach(() => {
  db = seedData();
  service = new OrderService(db);
});

describe('state machine', () => {
  it('allows pending to captured and pending to cancelled', () => {
    expect(canTransition(OrderStatus.Pending, OrderStatus.Captured)).toBe(true);
    expect(canTransition(OrderStatus.Pending, OrderStatus.Cancelled)).toBe(true);
  });

  it('refuses to move an order out of a terminal state', () => {
    expect(canTransition(OrderStatus.Refunded, OrderStatus.Captured)).toBe(false);
    expect(canTransition(OrderStatus.Cancelled, OrderStatus.Captured)).toBe(false);
  });
});

describe('create', () => {
  it('returns the first order when the idempotency key repeats', () => {
    const input = {
      id: 'ord_10',
      customerId: 'cus_01',
      amountMinor: 500,
      currency: 'USD',
      idempotencyKey: 'key-a',
    };
    const first = service.create(input);
    const second = service.create({ ...input, id: 'ord_11' });
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(second.value.id).toBe(first.value.id);
    expect(db.orders.filter((o) => o.id.startsWith('ord_1')).length).toBe(1);
  });

  it('rejects a duplicate order id', () => {
    const result = service.create({
      id: 'ord_01',
      customerId: 'cus_01',
      amountMinor: 100,
      currency: 'USD',
      idempotencyKey: 'key-b',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(OrderError.DuplicateId);
  });
});

describe('refund', () => {
  it('treats a zero amount as a no-op that still succeeds', () => {
    const result = service.refund('ord_02', 0, 'USD');
    expect(result.ok).toBe(true);
    expect(db.orders[1].status).toBe(OrderStatus.Pending);
  });

  it('refuses a refund in the wrong currency', () => {
    const result = service.refund('ord_01', 100, 'EUR');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(OrderError.CurrencyMismatch);
  });

  it('refuses to refund more than the remaining amount', () => {
    const result = service.refund('ord_03', 30000, 'EUR');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(OrderError.AmountTooLarge);
  });

  it('moves an order to refunded once the whole amount is back', () => {
    const result = service.refund('ord_03', 27000, 'EUR');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe(OrderStatus.Refunded);
  });

  it('reports what is left to refund', () => {
    expect(refundableMinor(db.orders[2])).toBe(27000);
    expect(refundableMinor(db.orders[4])).toBe(0);
  });
});

describe('reporting', () => {
  it('totals per currency and never mixes them', () => {
    const totals = totalsByCurrency(db.orders);
    expect(totals.get('USD')).toBe(4999 + 1250 + 0);
    expect(totals.get('EUR')).toBe(27000 + 800);
  });

  it('lists a customer orders in a stable order', () => {
    expect(ordersFor(db, 'cus_01').map((o) => o.id)).toEqual(['ord_01', 'ord_02']);
  });
});

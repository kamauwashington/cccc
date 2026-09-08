import { beforeEach, describe, expect, it } from 'vitest';
import { OrderError } from '../src/orders/service.js';
import * as orders from '../src/orders/service.js';
import { Currency, OrderStatus } from '../src/orders/types.js';

beforeEach(() => {
  orders.resetOrders();
});

function sampleOrder() {
  return orders.createOrder({
    customerId: 'cus_1',
    currency: Currency.Usd,
    lines: [{ sku: 'widget', quantity: 2, unitPrice: 1500 }],
  });
}

describe('creating an order', () => {
  it('starts pending with a derived total', () => {
    const order = sampleOrder();
    expect(order.status).toBe(OrderStatus.Pending);
    expect(order.totalCents).toBe(3000);
    expect(order.id).toMatch(/^ord_\d{4}$/);
  });

  it('refuses an order with no lines', () => {
    expect(() => orders.createOrder({ customerId: 'cus_1', lines: [] })).toThrow(OrderError);
  });

  it('defaults the currency to usd', () => {
    const order = orders.createOrder({
      customerId: 'cus_1',
      lines: [{ sku: 'a', quantity: 1, unitPrice: 100 }],
    });
    expect(order.currency).toBe(Currency.Usd);
  });
});

describe('the transition table', () => {
  it('moves pending to paid to shipped to delivered', () => {
    const order = sampleOrder();
    expect(orders.markPaid(order.id).status).toBe(OrderStatus.Paid);
    expect(orders.transition(order.id, OrderStatus.Shipped).status).toBe(OrderStatus.Shipped);
    expect(orders.transition(order.id, OrderStatus.Delivered).status).toBe(OrderStatus.Delivered);
  });

  it('refuses a jump from pending to shipped', () => {
    const order = sampleOrder();
    expect(() => orders.transition(order.id, OrderStatus.Shipped)).toThrow(OrderError);
  });

  it('cancels a pending order and then locks it', () => {
    const order = sampleOrder();
    expect(orders.cancelOrder(order.id).status).toBe(OrderStatus.Cancelled);
    expect(orders.allowedNextStatuses(OrderStatus.Cancelled)).toHaveLength(0);
  });

  it('covers every status with a row', () => {
    for (const status of Object.values(OrderStatus)) {
      expect(Array.isArray(orders.allowedNextStatuses(status))).toBe(true);
    }
  });

  it('throws for an unknown order', () => {
    expect(() => orders.getOrder('ord_9999')).toThrow(OrderError);
  });
});

describe('listing', () => {
  it('returns the orders that were created', () => {
    sampleOrder();
    sampleOrder();
    expect(orders.listOrders()).toHaveLength(2);
  });
});

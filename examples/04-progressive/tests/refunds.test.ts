import { beforeEach, describe, expect, it } from 'vitest';
import { OrderError } from '../src/orders/service.js';
import * as orders from '../src/orders/service.js';
import { OrderStatus } from '../src/orders/types.js';
import { NotificationKind } from '../src/notifications/types.js';
import { TEMPLATES } from '../src/notifications/templates.js';

beforeEach(() => {
  orders.resetOrders();
});

function paidOrder() {
  const order = orders.createOrder({
    customerId: 'cus_1',
    lines: [{ sku: 'widget', quantity: 2, unitPrice: 1500 }],
  });
  return orders.markPaid(order.id);
}

describe('the refunded status', () => {
  it('exists on the OrderStatus enum', () => {
    expect(OrderStatus.Refunded).toBe('refunded');
  });

  it('is reachable from paid and from delivered', () => {
    expect(orders.allowedNextStatuses(OrderStatus.Paid)).toContain(OrderStatus.Refunded);
    expect(orders.allowedNextStatuses(OrderStatus.Delivered)).toContain(OrderStatus.Refunded);
  });

  it('is terminal', () => {
    expect(orders.allowedNextStatuses(OrderStatus.Refunded)).toHaveLength(0);
  });

  it('is not reachable from pending', () => {
    expect(orders.allowedNextStatuses(OrderStatus.Pending)).not.toContain(OrderStatus.Refunded);
  });
});

describe('refunding an order', () => {
  it('refunds the whole total when no amount is given', () => {
    const order = paidOrder();
    const refunded = orders.refundOrder(order.id);
    expect(refunded.status).toBe(OrderStatus.Refunded);
    expect(refunded.refundedCents).toBe(3000);
  });

  it('accepts a partial amount in integer cents', () => {
    const order = paidOrder();
    const refunded = orders.refundOrder(order.id, 1000);
    expect(refunded.refundedCents).toBe(1000);
    expect(Number.isSafeInteger(refunded.refundedCents)).toBe(true);
  });

  it('refuses more than the order total', () => {
    const order = paidOrder();
    expect(() => orders.refundOrder(order.id, 3001)).toThrow(OrderError);
  });

  it('refuses a second refund, since refunded is terminal', () => {
    const order = paidOrder();
    orders.refundOrder(order.id, 1000);
    expect(() => orders.refundOrder(order.id, 500)).toThrow(OrderError);
  });

  it('refuses to refund an order that was never paid', () => {
    const order = orders.createOrder({
      customerId: 'cus_1',
      lines: [{ sku: 'widget', quantity: 1, unitPrice: 100 }],
    });
    expect(() => orders.refundOrder(order.id)).toThrow(OrderError);
  });

  it('reuses the notification kind that already exists', () => {
    expect(TEMPLATES[NotificationKind.OrderRefunded].subject).toBe('Refund on the way');
  });
});

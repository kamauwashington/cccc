import { beforeEach, describe, expect, it } from 'vitest';
import * as money from '../src/orders/money.js';
import { MoneyError } from '../src/orders/money.js';
import { createOrder, resetOrders } from '../src/orders/service.js';
import { authorizePayment, resetPayments } from '../src/payments/service.js';
import { Currency } from '../src/orders/types.js';

beforeEach(() => {
  resetOrders();
  resetPayments();
});

describe('money helpers', () => {
  it('accepts whole cents', () => {
    expect(money.cents(1999)).toBe(1999);
    expect(money.isCents(0)).toBe(true);
  });

  it('rejects a float', () => {
    expect(() => money.cents(19.99)).toThrow(MoneyError);
    expect(money.isCents(19.99)).toBe(false);
  });

  it('converts major units and refuses sub cent amounts', () => {
    expect(money.fromMajorUnits(19.99)).toBe(1999);
    expect(() => money.fromMajorUnits(0.001)).toThrow(MoneyError);
  });

  it('adds, subtracts, multiplies in cents', () => {
    expect(money.add(1999, 1)).toBe(2000);
    expect(money.subtract(2000, 1999)).toBe(1);
    expect(money.multiply(1999, 3)).toBe(5997);
    expect(money.sum([100, 250, 3])).toBe(353);
  });

  it('splits without losing a penny', () => {
    const parts = money.allocate(1000, 3);
    expect(parts).toEqual([334, 333, 333]);
    expect(money.sum(parts)).toBe(1000);
    for (const part of parts) expect(Number.isInteger(part)).toBe(true);
  });

  it('formats for display only', () => {
    expect(money.formatCents(1999)).toBe('19.99');
    expect(money.formatCents(5)).toBe('0.05');
    expect(money.formatCents(-1999)).toBe('-19.99');
  });
});

describe('money stays integer cents across the domains', () => {
  it('keeps every money field on an order an integer', () => {
    const order = createOrder({
      customerId: 'cus_1',
      currency: Currency.Usd,
      lines: [
        { sku: 'a', quantity: 2, unitPrice: 1999 },
        { sku: 'b', quantity: 1, unitPrice: 500 },
      ],
    });
    expect(order.totalCents).toBe(4498);
    expect(Number.isSafeInteger(order.totalCents)).toBe(true);
    for (const line of order.lines) expect(Number.isSafeInteger(line.unitPrice)).toBe(true);
  });

  it('keeps every money field on a payment an integer', () => {
    const payment = authorizePayment('ord_0001', 4498);
    expect(Number.isSafeInteger(payment.amountCents)).toBe(true);
    expect(Number.isSafeInteger(payment.refundedCents)).toBe(true);
  });

  it('refuses to build an order line priced in dollars', () => {
    expect(() =>
      createOrder({ customerId: 'cus_1', lines: [{ sku: 'a', quantity: 1, unitPrice: 19.99 }] })
    ).toThrow(MoneyError);
  });
});

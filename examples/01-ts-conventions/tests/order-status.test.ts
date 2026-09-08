import { describe, expect, expectTypeOf, it } from 'vitest';
import { ORDER_STATUSES, OrderStatus, isOrderStatus } from '../src/domain/order-status';

describe('OrderStatus', () => {
  // A TypeScript `enum` type is nominal, so it never equals a union of string
  // literals. This assertion only compiles once OrderStatus is a union.
  it('is a union of string literals', () => {
    expectTypeOf<OrderStatus>().toEqualTypeOf<
      'pending' | 'paid' | 'packed' | 'shipped' | 'delivered' | 'cancelled'
    >();
    expectTypeOf(OrderStatus.Pending).toEqualTypeOf<'pending'>();
  });

  it('accepts a plain string literal where the type is expected', () => {
    const status: OrderStatus = 'shipped';
    expect(status).toBe(OrderStatus.Shipped);
  });

  it('rejects a label that is not a member', () => {
    // @ts-expect-error 'archived' is not one of the order_status labels
    const status: OrderStatus = 'archived';
    expect(isOrderStatus(status)).toBe(false);
  });

  it('lists every value in declaration order', () => {
    expect(ORDER_STATUSES).toEqual([
      'pending',
      'paid',
      'packed',
      'shipped',
      'delivered',
      'cancelled',
    ]);
    expect(ORDER_STATUSES).toEqual(Object.values(OrderStatus));
  });

  it('guards unknown input', () => {
    expect(isOrderStatus('paid')).toBe(true);
    expect(isOrderStatus('PAID')).toBe(false);
    expect(isOrderStatus(3)).toBe(false);
    expect(isOrderStatus(undefined)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { OrderStatus } from '../src/domain/order-status';
import { canCancel, describeOrder, isTerminal, nextStatus } from '../src/service/orders';
import { assertNever } from '../src/util/assert-never';

describe('order workflow', () => {
  it('walks the happy path', () => {
    expect(nextStatus('pending')).toBe(OrderStatus.Paid);
    expect(nextStatus(OrderStatus.Paid)).toBe('packed');
    expect(nextStatus('packed')).toBe('shipped');
    expect(nextStatus('shipped')).toBe('delivered');
    expect(nextStatus('delivered')).toBeNull();
    expect(nextStatus('cancelled')).toBeNull();
  });

  it('knows the terminal states', () => {
    expect(isTerminal('delivered')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(isTerminal('paid')).toBe(false);
    expect(canCancel('paid')).toBe(true);
    expect(canCancel('shipped')).toBe(false);
  });

  it('throws through assertNever when the switch is handed a bad value', () => {
    expect(() => nextStatus('archived' as OrderStatus)).toThrow(/archived/);
    expect(() => assertNever('archived' as never, 'order status')).toThrow(
      'Unhandled order status: archived'
    );
  });

  it('describes an order', () => {
    const text = describeOrder({
      id: 'ord_1',
      status: 'shipped',
      carrier: 'fedex',
      trackingNumber: '999',
      priority: 2,
    });
    expect(text).toContain('ord_1 is shipped');
    expect(text).toContain('priority High');
    expect(text).toContain('fedex.com');
  });
});

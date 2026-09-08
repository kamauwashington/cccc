import { cents, isCents, multiply, sum } from './money.js';
import type { Cents } from './money.js';
import * as store from './store.js';
import { Currency, OrderStatus } from './types.js';
import type { NewOrderInput, Order, OrderLine } from './types.js';

export class OrderError extends Error {}

// The only place a status change is allowed to happen. Every route goes
// through this table, so a new status is one entry here plus one branch.
const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.Pending]: [OrderStatus.Paid, OrderStatus.Cancelled],
  [OrderStatus.Paid]: [OrderStatus.Shipped, OrderStatus.Cancelled, OrderStatus.Refunded],
  [OrderStatus.Shipped]: [OrderStatus.Delivered],
  [OrderStatus.Delivered]: [OrderStatus.Refunded],
  [OrderStatus.Cancelled]: [],
  [OrderStatus.Refunded]: [],
};

export function allowedNextStatuses(status: OrderStatus): readonly OrderStatus[] {
  return ALLOWED[status];
}

export function lineTotal(line: OrderLine): Cents {
  return multiply(line.unitPrice, line.quantity);
}

export function orderTotal(lines: readonly OrderLine[]): Cents {
  return sum(lines.map(lineTotal));
}

export function createOrder(input: NewOrderInput): Order {
  if (input.lines.length === 0) {
    throw new OrderError('an order needs at least one line');
  }
  const now = new Date().toISOString();
  const order: Order = {
    id: store.nextOrderId(),
    customerId: input.customerId,
    currency: input.currency ?? Currency.Usd,
    status: OrderStatus.Pending,
    lines: input.lines.map((line) => ({ ...line, unitPrice: cents(line.unitPrice) })),
    totalCents: orderTotal(input.lines),
    refundedCents: 0,
    createdAt: now,
    updatedAt: now,
  };
  return store.put(order);
}

export function getOrder(id: string): Order {
  const order = store.find(id);
  if (!order) throw new OrderError(`no order ${id}`);
  return order;
}

export function transition(id: string, next: OrderStatus): Order {
  const order = getOrder(id);
  if (!ALLOWED[order.status].includes(next)) {
    throw new OrderError(`cannot move order ${id} from ${order.status} to ${next}`);
  }
  order.status = next;
  order.updatedAt = new Date().toISOString();
  return store.put(order);
}

export function markPaid(id: string): Order {
  return transition(id, OrderStatus.Paid);
}

export function cancelOrder(id: string): Order {
  return transition(id, OrderStatus.Cancelled);
}

/**
 * Send money back and move the order to refunded. Leave `amountCents` out to
 * refund the whole total. Refunded is terminal, so this runs at most once per
 * order and the transition table is what enforces that.
 */
export function refundOrder(id: string, amountCents?: Cents): Order {
  const order = getOrder(id);
  if (amountCents !== undefined && !isCents(amountCents)) {
    throw new OrderError(`a refund must be a whole number of cents, got ${amountCents}`);
  }
  const amount = cents(amountCents ?? order.totalCents);
  if (amount <= 0) {
    throw new OrderError(`a refund on order ${id} must be more than zero cents`);
  }
  if (amount > order.totalCents) {
    throw new OrderError(
      `cannot refund ${amount} cents against a total of ${order.totalCents} on order ${id}`
    );
  }
  const refunded = transition(id, OrderStatus.Refunded);
  refunded.refundedCents = amount;
  return store.put(refunded);
}

export function listOrders(): Order[] {
  return store.list();
}

export function resetOrders(): void {
  store.clear();
}

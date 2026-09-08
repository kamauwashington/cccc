// Order service. This is the file /explain points at.
//
// It holds three things worth reading out loud: a state machine, refund math
// in minor units, and an idempotency cache. Each one has a rule that is easy to
// get wrong and cheap to state.

import { OrderStatus, type Database, type Order } from '../db/store.js';

/** Why a request was rejected. Callers map these onto HTTP status codes. */
export enum OrderError {
  NotFound = 'not_found',
  DuplicateId = 'duplicate_id',
  IllegalTransition = 'illegal_transition',
  AmountTooLarge = 'amount_too_large',
  CurrencyMismatch = 'currency_mismatch',
}

export interface Failure {
  ok: false;
  error: OrderError;
  message: string;
}

export interface Success<T> {
  ok: true;
  value: T;
}

export type Result<T> = Success<T> | Failure;

function fail(error: OrderError, message: string): Failure {
  return { ok: false, error, message };
}

function succeed<T>(value: T): Success<T> {
  return { ok: true, value };
}

// The state machine. Every allowed move is listed here and nowhere else.
// Adding a status without adding a row is a type error, which is the point.
const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.Pending]: [OrderStatus.Captured, OrderStatus.Cancelled],
  [OrderStatus.Captured]: [OrderStatus.Refunded],
  [OrderStatus.Refunded]: [],
  [OrderStatus.Cancelled]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from].includes(to);
}

export interface CreateOrderInput {
  id: string;
  customerId: string;
  amountMinor: number;
  currency: string;
  /** Repeat a key and you get the first order back instead of a second one. */
  idempotencyKey: string;
}

/**
 * Creates an order, or returns the one an earlier call with the same
 * idempotency key already created. The cache lives with the service instance,
 * so a restart forgets it. A real deployment would put it in the database.
 */
export class OrderService {
  private readonly seen = new Map<string, string>();

  constructor(private readonly db: Database) {}

  create(input: CreateOrderInput): Result<Order> {
    const previous = this.seen.get(input.idempotencyKey);
    if (previous) {
      const existing = this.db.orders.find((o) => o.id === previous);
      if (existing) return succeed(existing);
    }
    if (this.db.orders.some((o) => o.id === input.id)) {
      return fail(OrderError.DuplicateId, 'order ' + input.id + ' already exists');
    }

    const order: Order = {
      id: input.id,
      customerId: input.customerId,
      status: OrderStatus.Pending,
      amountMinor: input.amountMinor,
      currency: input.currency,
      refundedMinor: 0,
    };
    this.db.orders.push(order);
    this.seen.set(input.idempotencyKey, order.id);
    return succeed(order);
  }

  capture(orderId: string): Result<Order> {
    const order = this.find(orderId);
    if (!order) return fail(OrderError.NotFound, 'no order ' + orderId);
    if (!canTransition(order.status, OrderStatus.Captured)) {
      return fail(
        OrderError.IllegalTransition,
        'cannot capture an order in state ' + order.status
      );
    }
    order.status = OrderStatus.Captured;
    return succeed(order);
  }

  /**
   * Refunds part or all of a captured order. A zero amount is a no-op and
   * still succeeds, so a retry after a network timeout does not fail.
   */
  refund(orderId: string, amountMinor: number, currency: string): Result<Order> {
    const order = this.find(orderId);
    if (!order) return fail(OrderError.NotFound, 'no order ' + orderId);
    if (currency !== order.currency) {
      return fail(
        OrderError.CurrencyMismatch,
        'order is in ' + order.currency + ', refund asked for ' + currency
      );
    }
    if (amountMinor === 0) return succeed(order);
    if (order.status !== OrderStatus.Captured) {
      return fail(
        OrderError.IllegalTransition,
        'cannot refund an order in state ' + order.status
      );
    }
    const remaining = refundableMinor(order);
    if (amountMinor > remaining) {
      return fail(
        OrderError.AmountTooLarge,
        'refund of ' + amountMinor + ' exceeds the remaining ' + remaining
      );
    }
    order.refundedMinor += amountMinor;
    if (order.refundedMinor === order.amountMinor) {
      order.status = OrderStatus.Refunded;
    }
    return succeed(order);
  }

  private find(orderId: string): Order | undefined {
    return this.db.orders.find((o) => o.id === orderId);
  }
}

/** How much of an order can still be refunded, in minor units. */
export function refundableMinor(order: Order): number {
  return Math.max(0, order.amountMinor - order.refundedMinor);
}

/**
 * Totals a set of orders per currency. Mixing currencies in one number is the
 * bug this shape prevents.
 */
export function totalsByCurrency(orders: Order[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const order of orders) {
    out.set(order.currency, (out.get(order.currency) ?? 0) + order.amountMinor - order.refundedMinor);
  }
  return out;
}

import type { Order } from './types.js';

// An in memory store. Real persistence is out of scope for this example.
const orders = new Map<string, Order>();
let sequence = 0;

export function nextOrderId(): string {
  sequence += 1;
  return `ord_${String(sequence).padStart(4, '0')}`;
}

export function put(order: Order): Order {
  orders.set(order.id, order);
  return order;
}

export function find(id: string): Order | undefined {
  return orders.get(id);
}

export function list(): Order[] {
  return [...orders.values()];
}

export function clear(): void {
  orders.clear();
  sequence = 0;
}

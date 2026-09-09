// The orders list the demo works on.
//
// 137 rows is enough that handing back all of them is obviously wrong, and
// small enough that the whole thing fits in memory with no database.

export type OrderStatus = 'open' | 'paid' | 'shipped' | 'cancelled';

export type Order = {
  id: string;
  customer: string;
  status: OrderStatus;
  total: number;
  placedAt: string;
};

const CUSTOMERS = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Soylent', 'Hooli'];
const STATUSES: OrderStatus[] = ['open', 'paid', 'shipped', 'cancelled'];

export const ORDERS: Order[] = Array.from({ length: 137 }, (_, i) => ({
  id: 'ord_' + String(i + 1).padStart(4, '0'),
  customer: CUSTOMERS[i % CUSTOMERS.length],
  status: STATUSES[i % STATUSES.length],
  total: 1000 + ((i * 37) % 9000),
  placedAt: new Date(Date.UTC(2026, 0, 1 + (i % 90))).toISOString(),
}));

// Hands back all 137 rows every time. That is the thing to fix.
export function listOrders(): Order[] {
  return ORDERS;
}

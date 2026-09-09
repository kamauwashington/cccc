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

export const DEFAULT_PAGE_SIZE = 25;

export type ListOrdersOptions = {
  // The id of the last order on the previous page. Leave it out for page one.
  cursor?: string;
  limit?: number;
};

export type OrderPage = {
  rows: Order[];
  // The id to pass as the next cursor, or null on the last page.
  nextCursor: string | null;
};

// Cursor pagination. The cursor is the id of the last row handed back, so a
// page starts at the row after it. An unknown cursor starts from the top.
export function listOrders(options: ListOrdersOptions = {}): OrderPage {
  const limit = options.limit ?? DEFAULT_PAGE_SIZE;
  const after = options.cursor ? ORDERS.findIndex((o) => o.id === options.cursor) : -1;
  const start = after + 1;
  const rows = ORDERS.slice(start, start + limit);
  const end = start + rows.length;
  return {
    rows,
    nextCursor: end < ORDERS.length && rows.length > 0 ? rows[rows.length - 1].id : null,
  };
}

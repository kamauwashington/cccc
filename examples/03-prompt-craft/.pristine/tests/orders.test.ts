// The backstop for this example. It is not part of the demo and nobody looks
// at it on screen. It exists so CI can prove the built code works.
//
// It pins the three answers the `sharpen` skill asks for:
//   page size 25 by default, cursor based, rows plus a next cursor.

import { describe, it, expect } from 'vitest';
import type { Order } from '../src/orders';
import { ORDERS, listOrders } from '../src/orders';

describe('listOrders', () => {
  it('returns one page, not all 137 rows', () => {
    const page = listOrders();
    expect(page.rows).toHaveLength(25);
  });

  it('starts at the first order', () => {
    const page = listOrders();
    expect(page.rows[0].id).toBe(ORDERS[0].id);
  });

  it('hands back a cursor while rows remain', () => {
    const page = listOrders();
    expect(page.nextCursor).toBe(ORDERS[24].id);
  });

  it('continues after the cursor with no overlap', () => {
    const first = listOrders();
    const second = listOrders({ cursor: first.nextCursor ?? undefined });
    expect(second.rows).toHaveLength(25);
    expect(second.rows[0].id).toBe(ORDERS[25].id);
    const ids = new Set(first.rows.map((o: Order) => o.id));
    expect(second.rows.some((o: Order) => ids.has(o.id))).toBe(false);
  });

  it('honors a caller supplied limit', () => {
    expect(listOrders({ limit: 5 }).rows).toHaveLength(5);
  });

  it('walks every order exactly once', () => {
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 50; guard++) {
      const page = listOrders({ cursor });
      seen.push(...page.rows.map((o: Order) => o.id));
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    expect(seen).toEqual(ORDERS.map((o) => o.id));
    expect(new Set(seen).size).toBe(ORDERS.length);
  });

  it('reports no cursor on the last page', () => {
    const last = listOrders({ cursor: ORDERS[ORDERS.length - 2].id });
    expect(last.rows).toHaveLength(1);
    expect(last.nextCursor).toBeNull();
  });
});

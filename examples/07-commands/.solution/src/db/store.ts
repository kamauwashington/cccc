// A tiny JSON backed store for the demo. One file, two tables, no server.
//
// /db:seed fills it. /db:reset empties it. Both commands live in
// .claude/commands/db/, which is where the `db:` prefix comes from.

import fs from 'node:fs';
import path from 'node:path';

export enum OrderStatus {
  Pending = 'pending',
  Captured = 'captured',
  Refunded = 'refunded',
  Cancelled = 'cancelled',
}

export interface Customer {
  id: string;
  name: string;
  email: string;
}

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  /** Amount in minor units, so cents for USD. */
  amountMinor: number;
  currency: string;
  refundedMinor: number;
}

export interface Database {
  customers: Customer[];
  orders: Order[];
}

export function emptyDatabase(): Database {
  return { customers: [], orders: [] };
}

export function load(file: string): Database {
  if (!fs.existsSync(file)) return emptyDatabase();
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<Database>;
  return {
    customers: parsed.customers ?? [],
    orders: parsed.orders ?? [],
  };
}

export function save(file: string, db: Database): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(db, null, 2) + '\n', 'utf8');
}

/** Rows the seed command writes. Fixed, so a seed is repeatable. */
export function seedData(): Database {
  return {
    customers: [
      { id: 'cus_01', name: 'Ada Okafor', email: 'ada@example.com' },
      { id: 'cus_02', name: 'Bruno Salas', email: 'bruno@example.com' },
      { id: 'cus_03', name: 'Chen Wei', email: 'chen@example.com' },
    ],
    orders: [
      { id: 'ord_01', customerId: 'cus_01', status: OrderStatus.Captured, amountMinor: 4999, currency: 'USD', refundedMinor: 0 },
      { id: 'ord_02', customerId: 'cus_01', status: OrderStatus.Pending, amountMinor: 1250, currency: 'USD', refundedMinor: 0 },
      { id: 'ord_03', customerId: 'cus_02', status: OrderStatus.Captured, amountMinor: 32000, currency: 'EUR', refundedMinor: 5000 },
      { id: 'ord_04', customerId: 'cus_02', status: OrderStatus.Cancelled, amountMinor: 800, currency: 'EUR', refundedMinor: 0 },
      { id: 'ord_05', customerId: 'cus_03', status: OrderStatus.Refunded, amountMinor: 15000, currency: 'USD', refundedMinor: 15000 },
    ],
  };
}

export function counts(db: Database): { customers: number; orders: number } {
  return { customers: db.customers.length, orders: db.orders.length };
}

/** Orders for one customer, in id order, so the result never shuffles. */
export function ordersFor(db: Database, customerId: string): Order[] {
  return db.orders.filter((o) => o.customerId === customerId).sort((a, b) => a.id.localeCompare(b.id));
}

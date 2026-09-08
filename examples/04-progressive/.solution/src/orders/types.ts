import type { Cents } from './money.js';

export enum OrderStatus {
  Pending = 'pending',
  Paid = 'paid',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
  Refunded = 'refunded',
}

export enum Currency {
  Usd = 'usd',
  Eur = 'eur',
}

export interface OrderLine {
  sku: string;
  quantity: number;
  /** Unit price in cents. */
  unitPrice: Cents;
}

export interface Order {
  id: string;
  customerId: string;
  currency: Currency;
  status: OrderStatus;
  lines: OrderLine[];
  /** Order total in cents. Derived from the lines. */
  totalCents: Cents;
  /** Amount sent back to the customer, in cents. Zero until a refund lands. */
  refundedCents: Cents;
  createdAt: string;
  updatedAt: string;
}

export interface NewOrderInput {
  customerId: string;
  currency?: Currency;
  lines: OrderLine[];
}

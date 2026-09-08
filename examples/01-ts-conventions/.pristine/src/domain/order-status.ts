// Source of truth for these labels is the Postgres type `order_status`.
// See src/db/sql.ts. Keep the two in the same order.
export enum OrderStatus {
  Pending = 'pending',
  Paid = 'paid',
  Packed = 'packed',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
}

export function isOrderStatus(v: unknown): v is OrderStatus {
  return typeof v === 'string' && Object.values(OrderStatus).includes(v as OrderStatus);
}

// Source of truth for these labels is the Postgres type `order_status`.
// See src/db/sql.ts. Keep the two in the same order.
export const OrderStatus = {
  Pending: 'pending',
  Paid: 'paid',
  Packed: 'packed',
  Shipped: 'shipped',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

// Cast to a non empty tuple so drizzle `pgEnum` and `z.enum` accept it.
export const ORDER_STATUSES = Object.values(OrderStatus) as [OrderStatus, ...OrderStatus[]];

export function isOrderStatus(v: unknown): v is OrderStatus {
  return typeof v === 'string' && (ORDER_STATUSES as readonly unknown[]).includes(v);
}

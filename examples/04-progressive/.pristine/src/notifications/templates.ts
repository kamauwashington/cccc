import { NotificationKind } from './types.js';

export interface Template {
  subject: string;
  body: (orderId: string) => string;
}

// Every kind needs an entry. TypeScript fails the build when one is missing.
export const TEMPLATES: Record<NotificationKind, Template> = {
  [NotificationKind.OrderPlaced]: {
    subject: 'We got your order',
    body: (id) => `Order ${id} is in. We will email again when it ships.`,
  },
  [NotificationKind.OrderPaid]: {
    subject: 'Payment received',
    body: (id) => `Payment for order ${id} cleared.`,
  },
  [NotificationKind.OrderShipped]: {
    subject: 'Your order is on the way',
    body: (id) => `Order ${id} left the warehouse.`,
  },
  [NotificationKind.OrderDelivered]: {
    subject: 'Delivered',
    body: (id) => `Order ${id} arrived.`,
  },
  [NotificationKind.OrderCancelled]: {
    subject: 'Order cancelled',
    body: (id) => `Order ${id} was cancelled. You were not charged.`,
  },
  [NotificationKind.OrderRefunded]: {
    subject: 'Refund on the way',
    body: (id) => `We sent the money for order ${id} back to you.`,
  },
};

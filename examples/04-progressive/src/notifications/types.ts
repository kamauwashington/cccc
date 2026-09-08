export enum Channel {
  Email = 'email',
  Sms = 'sms',
}

export enum NotificationKind {
  OrderPlaced = 'order-placed',
  OrderPaid = 'order-paid',
  OrderShipped = 'order-shipped',
  OrderDelivered = 'order-delivered',
  OrderCancelled = 'order-cancelled',
  OrderRefunded = 'order-refunded',
}

export interface Notification {
  id: string;
  kind: NotificationKind;
  channel: Channel;
  to: string;
  subject: string;
  body: string;
}

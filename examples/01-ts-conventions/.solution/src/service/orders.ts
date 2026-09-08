import { OrderStatus } from '../domain/order-status';
import { ShipmentCarrier } from '../domain/shipment-carrier';
import { Priority, priorityName } from '../domain/priority';
import { assertNever } from '../util/assert-never';
import { trackingUrl } from './carriers';

export interface Order {
  id: string;
  status: OrderStatus;
  carrier?: ShipmentCarrier;
  trackingNumber?: string;
  priority: Priority;
}

// The switch has no fallthrough case. Every member is listed, and the default
// branch hands the value to assertNever.
export function nextStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case OrderStatus.Pending:
      return OrderStatus.Paid;
    case OrderStatus.Paid:
      return OrderStatus.Packed;
    case OrderStatus.Packed:
      return OrderStatus.Shipped;
    case OrderStatus.Shipped:
      return OrderStatus.Delivered;
    case OrderStatus.Delivered:
      return null;
    case OrderStatus.Cancelled:
      return null;
    default:
      return assertNever(status, 'order status');
  }
}

export function isTerminal(status: OrderStatus): boolean {
  return status === OrderStatus.Delivered || status === OrderStatus.Cancelled;
}

export function canCancel(status: OrderStatus): boolean {
  return !isTerminal(status) && status !== OrderStatus.Shipped;
}

export function describeOrder(order: Order): string {
  const parts = [`${order.id} is ${order.status}`, `priority ${priorityName(order.priority)}`];
  if (order.carrier && order.trackingNumber) {
    parts.push(trackingUrl(order.carrier, order.trackingNumber));
  }
  return parts.join(', ');
}

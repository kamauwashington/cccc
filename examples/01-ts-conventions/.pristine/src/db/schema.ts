import { pgEnum, pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core';
import { Priority } from '../domain/priority';
import { ORDER_STATUS_TYPE, SHIPMENT_CARRIER_TYPE } from './sql';

// The label list is typed out again here, by hand, because an enum type
// cannot be handed to pgEnum as a values array.
export const orderStatusEnum = pgEnum(ORDER_STATUS_TYPE, [
  'pending',
  'paid',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
]);

export const shipmentCarrierEnum = pgEnum(SHIPMENT_CARRIER_TYPE, [
  'ups',
  'fedex',
  'usps',
  'dhl',
]);

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  status: orderStatusEnum('status').notNull(),
  carrier: shipmentCarrierEnum('carrier'),
  priority: smallint('priority').$type<Priority>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

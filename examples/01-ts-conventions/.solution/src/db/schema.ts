import { pgEnum, pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core';
import { ORDER_STATUSES } from '../domain/order-status';
import { SHIPMENT_CARRIERS } from '../domain/shipment-carrier';
import type { Priority } from '../domain/priority';
import { ORDER_STATUS_TYPE, SHIPMENT_CARRIER_TYPE } from './sql';

// Both enums come straight from the const objects in src/domain. The label
// list is written once and read here.
export const orderStatusEnum = pgEnum(ORDER_STATUS_TYPE, ORDER_STATUSES);
export const shipmentCarrierEnum = pgEnum(SHIPMENT_CARRIER_TYPE, SHIPMENT_CARRIERS);

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  status: orderStatusEnum('status').notNull(),
  carrier: shipmentCarrierEnum('carrier'),
  priority: smallint('priority').$type<Priority>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

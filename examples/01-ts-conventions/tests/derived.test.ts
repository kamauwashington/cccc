import { describe, expect, it } from 'vitest';
import { ORDER_STATUSES, OrderStatus } from '../src/domain/order-status';
import { SHIPMENT_CARRIERS, ShipmentCarrier } from '../src/domain/shipment-carrier';
import { PRIORITIES, Priority } from '../src/domain/priority';
import { orderStatusEnum, shipmentCarrierEnum } from '../src/db/schema';
import {
  orderStatusSchema,
  prioritySchema,
  shipmentCarrierSchema,
  createOrderSchema,
} from '../src/api/validation';

// The label list is written once, in the const object. These tests fail the
// moment someone types it out a second time and the two copies drift.
describe('everything is derived from one const object', () => {
  it('drizzle pgEnum matches the const object', () => {
    expect(orderStatusEnum.enumValues).toEqual(Object.values(OrderStatus));
    expect(shipmentCarrierEnum.enumValues).toEqual(Object.values(ShipmentCarrier));
    expect(orderStatusEnum.enumName).toBe('order_status');
    expect(shipmentCarrierEnum.enumName).toBe('shipment_carrier');
  });

  it('zod schemas match the const object', () => {
    expect(orderStatusSchema.options).toEqual(Object.values(OrderStatus));
    expect(shipmentCarrierSchema.options).toEqual(Object.values(ShipmentCarrier));
    expect(prioritySchema.values).toEqual(new Set(Object.values(Priority)));
  });

  it('the values arrays are the same list drizzle and zod got', () => {
    expect(ORDER_STATUSES).toEqual(orderStatusEnum.enumValues);
    expect(SHIPMENT_CARRIERS).toEqual(shipmentCarrierEnum.enumValues);
    expect(PRIORITIES).toEqual(Object.values(Priority));
  });

  it('parses a valid order and rejects a bad label', () => {
    const parsed = createOrderSchema.parse({
      id: 'ord_1',
      status: 'paid',
      carrier: 'ups',
      priority: 1,
    });
    expect(parsed.status).toBe(OrderStatus.Paid);
    expect(createOrderSchema.safeParse({ id: 'x', status: 'archived', priority: 1 }).success).toBe(
      false
    );
    expect(createOrderSchema.safeParse({ id: 'x', status: 'paid', priority: 9 }).success).toBe(
      false
    );
  });
});

import { z } from 'zod';
import { ORDER_STATUSES } from '../domain/order-status';
import { SHIPMENT_CARRIERS } from '../domain/shipment-carrier';
import { PRIORITIES } from '../domain/priority';

// Every schema reads the same values array the const object produced.
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const shipmentCarrierSchema = z.enum(SHIPMENT_CARRIERS);
export const prioritySchema = z.literal(PRIORITIES);

export const createOrderSchema = z.object({
  id: z.string().min(1),
  status: orderStatusSchema,
  carrier: shipmentCarrierSchema.optional(),
  priority: prioritySchema,
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

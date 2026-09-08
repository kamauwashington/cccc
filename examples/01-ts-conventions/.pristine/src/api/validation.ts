import { z } from 'zod';
import { OrderStatus } from '../domain/order-status';
import { ShipmentCarrier } from '../domain/shipment-carrier';
import { Priority } from '../domain/priority';

export const orderStatusSchema = z.enum(OrderStatus);
export const shipmentCarrierSchema = z.enum(ShipmentCarrier);
export const prioritySchema = z.nativeEnum(Priority);

export const createOrderSchema = z.object({
  id: z.string().min(1),
  status: orderStatusSchema,
  carrier: shipmentCarrierSchema.optional(),
  priority: prioritySchema,
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

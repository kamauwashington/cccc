import { Carrier, ShipmentStatus } from './types.js';
import type { Shipment } from './types.js';

export class FulfillmentError extends Error {}

const shipments = new Map<string, Shipment>();
let sequence = 0;

const NEXT: Record<ShipmentStatus, ShipmentStatus | null> = {
  [ShipmentStatus.Queued]: ShipmentStatus.Picked,
  [ShipmentStatus.Picked]: ShipmentStatus.Handed,
  [ShipmentStatus.Handed]: ShipmentStatus.Delivered,
  [ShipmentStatus.Delivered]: null,
};

export function createShipment(orderId: string, carrier: Carrier = Carrier.Ground): Shipment {
  sequence += 1;
  const shipment: Shipment = {
    id: `shp_${String(sequence).padStart(4, '0')}`,
    orderId,
    carrier,
    status: ShipmentStatus.Queued,
    trackingCode: `${carrier.toUpperCase()}-${String(sequence).padStart(6, '0')}`,
  };
  shipments.set(shipment.id, shipment);
  return shipment;
}

export function advance(id: string): Shipment {
  const shipment = getShipment(id);
  const next = NEXT[shipment.status];
  if (next === null) throw new FulfillmentError(`shipment ${id} is already delivered`);
  shipment.status = next;
  return shipment;
}

export function getShipment(id: string): Shipment {
  const shipment = shipments.get(id);
  if (!shipment) throw new FulfillmentError(`no shipment ${id}`);
  return shipment;
}

export function shipmentsForOrder(orderId: string): Shipment[] {
  return [...shipments.values()].filter((s) => s.orderId === orderId);
}

export function resetShipments(): void {
  shipments.clear();
  sequence = 0;
}

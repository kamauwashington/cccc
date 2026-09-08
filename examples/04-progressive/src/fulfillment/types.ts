export enum ShipmentStatus {
  Queued = 'queued',
  Picked = 'picked',
  Handed = 'handed',
  Delivered = 'delivered',
}

export enum Carrier {
  Ground = 'ground',
  Air = 'air',
  Courier = 'courier',
}

export interface Shipment {
  id: string;
  orderId: string;
  carrier: Carrier;
  status: ShipmentStatus;
  trackingCode: string;
}

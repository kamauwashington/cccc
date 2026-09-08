// Source of truth for these labels is the Postgres type `shipment_carrier`.
// See src/db/sql.ts.
export enum ShipmentCarrier {
  Ups = 'ups',
  Fedex = 'fedex',
  Usps = 'usps',
  Dhl = 'dhl',
}

export function isShipmentCarrier(v: unknown): v is ShipmentCarrier {
  return typeof v === 'string' && Object.values(ShipmentCarrier).includes(v as ShipmentCarrier);
}

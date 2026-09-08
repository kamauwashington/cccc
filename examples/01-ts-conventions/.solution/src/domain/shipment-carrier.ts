// Source of truth for these labels is the Postgres type `shipment_carrier`.
// See src/db/sql.ts.
export const ShipmentCarrier = {
  Ups: 'ups',
  Fedex: 'fedex',
  Usps: 'usps',
  Dhl: 'dhl',
} as const;

export type ShipmentCarrier = (typeof ShipmentCarrier)[keyof typeof ShipmentCarrier];

export const SHIPMENT_CARRIERS = Object.values(ShipmentCarrier) as [
  ShipmentCarrier,
  ...ShipmentCarrier[],
];

export function isShipmentCarrier(v: unknown): v is ShipmentCarrier {
  return typeof v === 'string' && (SHIPMENT_CARRIERS as readonly unknown[]).includes(v);
}

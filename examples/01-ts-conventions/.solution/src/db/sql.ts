// The DDL below is the source of truth for the two Postgres enum types. The
// TypeScript unions have to match it, label for label, in this order.
//
// Never reorder or drop a label in a later migration. Postgres has no
// `ALTER TYPE ... DROP VALUE`, and reordering rewrites every dependent index.
// Adding one at the end is the only safe change.
export const ORDER_STATUS_TYPE = 'order_status';
export const SHIPMENT_CARRIER_TYPE = 'shipment_carrier';

export const CREATE_ENUM_TYPES = `
create type order_status as enum (
  'pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled'
);
create type shipment_carrier as enum (
  'ups', 'fedex', 'usps', 'dhl'
);
`;

// Reads the labels of one Postgres enum type in declaration order.
export const ENUM_LABELS_QUERY =
  'select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid ' +
  'where t.typname = $1 order by e.enumsortorder';

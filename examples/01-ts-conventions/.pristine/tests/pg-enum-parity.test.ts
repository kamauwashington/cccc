import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ORDER_STATUSES } from '../src/domain/order-status';
import { SHIPMENT_CARRIERS } from '../src/domain/shipment-carrier';
import { orderStatusEnum, shipmentCarrierEnum } from '../src/db/schema';
import {
  CREATE_ENUM_TYPES,
  ENUM_LABELS_QUERY,
  ORDER_STATUS_TYPE,
  SHIPMENT_CARRIER_TYPE,
} from '../src/db/sql';

let db: PGlite;

async function labels(typeName: string): Promise<string[]> {
  const result = await db.query<{ enumlabel: string }>(ENUM_LABELS_QUERY, [typeName]);
  return result.rows.map((row) => row.enumlabel);
}

// Postgres is the source of truth. This boots a real Postgres in process,
// creates the types, reads the pg_enum catalog, and diffs the labels against
// the TypeScript values array.
describe('postgres enum parity', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(CREATE_ENUM_TYPES);
  });

  afterAll(async () => {
    await db?.close();
  });

  it('order_status labels match the TypeScript union', async () => {
    expect(await labels(ORDER_STATUS_TYPE)).toEqual(ORDER_STATUSES);
  });

  it('shipment_carrier labels match the TypeScript union', async () => {
    expect(await labels(SHIPMENT_CARRIER_TYPE)).toEqual(SHIPMENT_CARRIERS);
  });

  it('drizzle would emit the same labels Postgres holds', async () => {
    expect(orderStatusEnum.enumValues).toEqual(await labels(ORDER_STATUS_TYPE));
    expect(shipmentCarrierEnum.enumValues).toEqual(await labels(SHIPMENT_CARRIER_TYPE));
  });

  it('accepts every union value as a real column value', async () => {
    await db.exec('create table t (status order_status not null)');
    for (const status of ORDER_STATUSES) {
      await db.query('insert into t (status) values ($1)', [status]);
    }
    const stored = await db.query<{ status: string }>('select status from t');
    expect(stored.rows.map((r) => r.status).sort()).toEqual([...ORDER_STATUSES].sort());
  });
});

import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  SHIPMENT_CARRIERS,
  ShipmentCarrier,
  isShipmentCarrier,
} from '../src/domain/shipment-carrier';
import { trackingUrl } from '../src/service/carriers';

describe('ShipmentCarrier', () => {
  it('is a union of string literals', () => {
    expectTypeOf<ShipmentCarrier>().toEqualTypeOf<'ups' | 'fedex' | 'usps' | 'dhl'>();
  });

  it('lists every value in declaration order', () => {
    expect(SHIPMENT_CARRIERS).toEqual(['ups', 'fedex', 'usps', 'dhl']);
    expect(SHIPMENT_CARRIERS).toEqual(Object.values(ShipmentCarrier));
  });

  it('guards unknown input', () => {
    expect(isShipmentCarrier('dhl')).toBe(true);
    expect(isShipmentCarrier('royal-mail')).toBe(false);
  });

  it('builds a tracking url from a plain literal', () => {
    expect(trackingUrl('usps', 'AB 12')).toContain('AB%2012');
  });
});

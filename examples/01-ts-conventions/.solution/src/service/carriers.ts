import { ShipmentCarrier } from '../domain/shipment-carrier';

// A Record keyed by the union. Add a carrier and this object stops compiling
// until you fill in the new key.
export const CARRIER_TRACKING_URLS: Record<ShipmentCarrier, string> = {
  [ShipmentCarrier.Ups]: 'https://www.ups.com/track?tracknum=',
  [ShipmentCarrier.Fedex]: 'https://www.fedex.com/fedextrack/?trknbr=',
  [ShipmentCarrier.Usps]: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
  [ShipmentCarrier.Dhl]: 'https://www.dhl.com/en/express/tracking.html?AWB=',
};

export function trackingUrl(carrier: ShipmentCarrier, trackingNumber: string): string {
  return CARRIER_TRACKING_URLS[carrier] + encodeURIComponent(trackingNumber);
}

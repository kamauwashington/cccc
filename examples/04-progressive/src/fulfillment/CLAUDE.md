# fulfillment

Getting the box to the customer.

- `types.ts` `ShipmentStatus`, `Carrier`, and the `Shipment` shape.
- `service.ts` a linear status chain plus a module level `Map`.
- `routes.ts` the Express router.

## Rules for this domain

- The shipment chain is linear and one directional. `advance()` walks it. There
  is no jump and no rollback. A cancelled or returned box is an order concern,
  handled in the orders domain.
- Tracking codes are generated, never supplied by a caller.
- No money lives here. A shipping charge belongs on an order line.

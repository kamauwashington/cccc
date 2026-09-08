# payments

Charging the customer. Nothing here talks to a real network.

- `types.ts` `PaymentStatus`, `PaymentMethod`, and the `Payment` shape.
- `gateway.ts` a deterministic stub. Same input, same reference string, always.
- `service.ts` authorize, capture, void, plus a module level `Map`.
- `routes.ts` the Express router.

## Rules for this domain

- The gateway already exposes `sendBack()` for returning money. It is wired to
  nothing. Use it rather than writing a second refund path.
- `amountCents` and `refundedCents` are integer cents. See the money rule.
- Reference strings carry the state in their prefix: `auth_`, `cap_`, `void_`,
  `rfnd_`. Keep that convention if you add a call.

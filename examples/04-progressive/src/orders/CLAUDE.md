# orders

The order lifecycle. This is the domain that owns status.

- `types.ts` the `OrderStatus` enum, `Currency`, and the `Order` shape.
- `service.ts` the transition table and every function that changes an order.
- `store.ts` a module level `Map`. Call `resetOrders()` at the top of a test.
- `money.ts` all money arithmetic. Integer cents only.
- `routes.ts` the Express router. Handlers call the service and map errors.

## Rules for this domain

- Add a status by adding one enum member and one row in the `ALLOWED` table in
  `service.ts`. The table is exhaustive, so `tsc` tells you what is missing.
- Never assign `order.status` outside `transition()`. That function is the only
  place the table is enforced.
- A status that no other status can leave is terminal. Give it an empty array.
- `totalCents` is derived from the lines. Recompute it, never patch it.

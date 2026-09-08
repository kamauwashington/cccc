# Order processing API

Express 5 service. Four domains live under `src/`. Each one carries its own
`CLAUDE.md` holding the detail for that domain. It loads when you read a file
in that folder.

## Do not survey the tree

Do not list, glob, or grep the repository to work out where things live. This
map is the index. Open the one domain the task names, read its `CLAUDE.md`
first, and leave the other three closed.

## Map

- `src/orders/CLAUDE.md` order lifecycle, status transition table, money.
- `src/payments/CLAUDE.md` authorize, capture, void. The gateway is a stub.
- `src/fulfillment/CLAUDE.md` shipments, carriers, tracking codes.
- `src/notifications/CLAUDE.md` outbox and message templates.
- `src/app.ts` mounts the four routers. `src/server.ts` starts it.
- `tests/` vitest. `tests/context.test.ts` checks this file, not the code.

## What you cannot read off the code

- Money is integer cents everywhere. `src/orders/money.ts` owns the arithmetic.
  A float in a money field is a bug, never a rounding choice.
- `src/orders/service.ts` holds the only status transition table. Routes never
  assign `status` themselves. A new status is one entry in that table plus the
  function that uses it.
- The other three domains are already refund aware and unused. The gateway has
  `sendBack`. Notifications has an `OrderRefunded` kind. Wire, do not rewrite.
- The stores are module level `Map`s. Tests call the `reset*` helpers first.
- Run `npm run typecheck` and `npm test` before you call the work done.

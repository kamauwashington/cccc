# Solved state for 04-progressive

The `src/orders/` tree after the prompt `Add a refunded status to orders.`
lands. Three files change and nothing outside the orders domain moves:

- `src/orders/types.ts` adds `OrderStatus.Refunded` and a `refundedCents`
  field on `Order`, in integer cents like every other money field.
- `src/orders/service.ts` adds the `Refunded` row to the `ALLOWED` table,
  reachable from `Paid` and `Delivered` and terminal, plus `refundOrder()`.
  The amount defaults to the order total, has to be whole cents, and cannot
  exceed the total. A second refund fails because the table says refunded is
  terminal.
- `src/orders/routes.ts` adds `POST /orders/:id/refund`, which reads
  `amountCents` from the body and maps an `OrderError` to 400.

The other three domains were already refund ready and stay untouched. That is
the point of the example: the task opens one domain, so only that domain's
`CLAUDE.md` and money rule get paid for.

Copy it over the live files when a run stalls:

```
npm run solution -- 04
```

Then keep talking. `npm run reset -- 04` puts the starting state back.

Do not edit anything here during a demo.

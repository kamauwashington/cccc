# Solution snapshot

The finished `src/orders.ts` for 03-prompt-craft. It is what the run should
write once the three questions are answered: page size 25 by default, cursor
based, rows plus a next cursor.

The starting `src/orders.ts` hands back all 137 rows from a `listOrders()` that
takes no arguments. `tests/orders.test.ts` starts red because of that.

The test suite is a backstop, never part of the demo. Nobody puts it on screen.
It exists so CI can prove the built code works.

Use this as the fallback when a live run stalls:

```
npm run solution -- 03
```

That copies `src/orders.ts` over the live file. Then `npm run typecheck` and
`npm test` both pass. `npm run reset -- 03` puts the starting version back.

Do not edit anything here during a demo.

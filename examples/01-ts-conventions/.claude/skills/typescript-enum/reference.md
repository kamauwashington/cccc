# TypeScript enum conventions: reference

Longer notes behind the three rules in `SKILL.md`.

## Why `erasableSyntaxOnly` bans `enum`

Node can run TypeScript files directly by stripping the types out. Stripping
only works when every piece of TypeScript syntax erases to nothing. A TS `enum`
does not erase. It compiles down to a runtime object and an IIFE, so a type
stripper has to emit code. `erasableSyntaxOnly: true` makes the compiler flag
every construct that emits code: `enum`, `namespace` with a runtime body, and
constructor parameter properties.

The compile error reads:

```
error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

`const enum` is banned by the same flag, and it also breaks `isolatedModules`.

## The guard

```ts
export function isDirection(v: unknown): v is Direction {
  return typeof v === 'string' && (DIRECTIONS as readonly unknown[]).includes(v);
}
```

The `as readonly unknown[]` widens the array so `.includes` accepts an
`unknown`. Without it, `Array.prototype.includes` demands an argument that is
already the union, which defeats the point of a guard.

Use the guard at every boundary: request bodies, environment variables, rows
that came back from a driver typed as `string`.

## Losing the reverse map on a numeric set

A numeric TypeScript enum emits both directions:

```ts
enum Priority { Low, Normal, High, Urgent }
Priority.High   // 2
Priority[2]     // 'High'
```

A const object gives you only the forward direction. Build the reverse map
once, from the same object, so the names are still written once:

```ts
export const PRIORITY_NAMES = Object.fromEntries(
  Object.entries(Priority).map(([name, value]) => [value, name])
) as Record<Priority, PriorityName>;
```

The tradeoff:

| | numeric enum | const object |
| --- | --- | --- |
| Reverse lookup | free, built in | one small map you maintain |
| Runtime cost | an object plus an IIFE per enum | a plain frozen shape |
| Erasable | no | yes |
| Accepts a raw `2` | no, needs a cast | yes |
| Iteration | `Object.values` returns names and values mixed together | clean |

That last row is the one that bites people. `Object.values` on a numeric enum
returns eight entries for a four member enum, because the reverse keys are in
there too. A const object returns four.

Prefer string values when the set is stored anywhere. Numbers are only worth it
when the column is already a smallint or the wire format demands it.

## Exhaustive switches

```ts
switch (status) {
  case OrderStatus.Pending:
    return OrderStatus.Paid;
  // ... every other member ...
  default:
    return assertNever(status, 'order status');
}
```

`assertNever` takes a `never`. If a member is added to the union and the switch
does not handle it, the value reaching `default` is no longer `never` and the
build fails with a clear message. It also throws at runtime, which catches a
bad value that came in from outside the type system.

A `Record<Union, T>` lookup table gets you the same protection without a
switch. `src/service/carriers.ts` uses one. Reach for the record when every
branch returns a value with no logic in it.

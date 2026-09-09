---
name: postgres-enum
description: Postgres enum type rules for this workspace. The CREATE TYPE definition is the source of truth, the Drizzle pgEnum derives from the same const object, and the label list is append only. Use when writing or changing a Postgres enum type, a Drizzle pgEnum, a column that stores one, or a migration.
---

# Postgres enum conventions

One Postgres enum type backs each fixed set of named values. Three rules cover
the database side.

## The three rules

1. The Postgres `CREATE TYPE ... AS ENUM` definition is the source of truth.
   The TypeScript union has to match it, label for label, in the same order.
   `src/db/sql.ts` holds the definitions.
2. Derive the Drizzle `pgEnum` from the same const object. Never write the
   label list a second time.
3. Never reorder or remove enum members in a migration. Postgres does not allow
   it. Appending a label at the end is the only safe change.

## Deriving the column

```ts
export const directionEnum = pgEnum('direction', DIRECTIONS);
```

`DIRECTIONS` is the values array the TypeScript side exports. One list, one
place.

## The tuple cast

`Object.values(X)` returns an array type, so `('a' | 'b')[]`. Drizzle's
`pgEnum` wants a non empty tuple, `[T, ...T[]]`. Cast once, at the point where
the values array is declared:

```ts
export const DIRECTIONS = Object.values(Direction) as [Direction, ...Direction[]];
```

That is the only cast in the pattern. Everything downstream is inferred.
Keeping the cast on the shared array means Drizzle and Zod read the same value.

## Migrations

Postgres allows exactly one change to an existing enum type in practice:

```sql
alter type direction add value 'diagonal';
```

It appends. There is no `DROP VALUE`. Reordering means creating a new type,
rewriting every dependent column, and dropping the old type, which locks the
tables. Treat the label list as append only.

Because of that, keep the TypeScript const object in the same order as the SQL.
The parity test in `tests/pg-enum-parity.test.ts` reads the `pg_enum` catalog
and compares the labels in `enumsortorder` against the values array. It fails
on a reorder, and not only on a missing label.

## Checklist for a new stored set

1. Write the `CREATE TYPE ... AS ENUM` first.
2. Add the const object and union in `src/domain/`, same labels, same order.
3. Add the SCREAMING_CASE values array with the tuple cast.
4. Point `pgEnum` at the values array.
5. Add the labels to the parity test.

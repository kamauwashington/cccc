---
name: typescript-enum
description: TypeScript house style for a fixed set of named values. The const object plus union pattern that replaces the enum keyword, the naming rule, and exhaustive switches. Use when writing or changing any fixed set of named values in TypeScript, or any switch over a union.
---

# TypeScript enum conventions

A fixed set of named values in this project is a `const` object plus a union
type under the same name. Three rules cover the TypeScript side.

## The three rules

1. Never use the TypeScript `enum` keyword. Use a `const` object, a union type
   merged under the same name, and an `is` guard. `tsconfig.json` sets
   `erasableSyntaxOnly`, so `enum` is a compile error here.
2. Naming: singular PascalCase for the type and the const object, plural
   SCREAMING_CASE for the values array. `Direction` and `DIRECTIONS`.
3. Every switch over a union ends with a call to `assertNever`. It lives in
   `src/util/assert-never.ts`.

## The shape

```ts
export const Direction = {
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];

export const DIRECTIONS = Object.values(Direction);

export function isDirection(v: unknown): v is Direction {
  return typeof v === 'string' && (DIRECTIONS as readonly unknown[]).includes(v);
}
```

## Why the const and the type share one name

TypeScript keeps values and types in separate namespaces. `const Direction`
lands in the value namespace. `type Direction` lands in the type namespace.
Declaring both under one name gives you the two things an enum gave you:

```ts
const a = Direction.Up;          // the const object, value namespace
let b: Direction = 'up';         // the union type, type namespace
```

The second line is the part a TypeScript `enum` cannot do. An enum type is
nominal, so a raw `'up'` is not assignable to it. A union is structural, so
plain string literals from JSON, from a form, or from a database row fit
without a cast.

## Numeric sets

A numeric TypeScript enum gives you a reverse map for free, so `Level[2]`
returns `'Warn'`. A const object does not. Build the reverse map once, from the
same object, and export a small helper beside it. `reference.md` has the shape.

## Further reading

Read `reference.md` in this folder for the compiler flag, the guard, the full
numeric case, and exhaustive switches.

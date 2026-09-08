---
name: zod-schema
description: Zod validation rules for this workspace. Every enum schema derives from the shared const object, numeric sets use z.literal, and untrusted input is validated at the boundary. Use when writing validation schemas, request body parsers, or DTO types.
---

# Zod schema conventions

Validation reads the same value list the rest of the code reads. Three rules.

## The three rules

1. Derive the schema with `z.enum(VALUES)` from the same const object. Never
   type the label list a second time.
2. A numeric set cannot use `z.enum`. Use `z.literal(VALUES)`, which takes an
   array of literals and produces the same union.
3. Validate at the boundary. Request bodies, environment variables, and driver
   rows typed as `string` all go through a schema or an `is` guard before they
   reach domain code.

## Deriving the schema

```ts
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const shipmentCarrierSchema = z.enum(SHIPMENT_CARRIERS);
```

Both read the array that `Object.values` produced. `z.enum` accepts a plain
readonly string array, so no cast is needed here.

## Numeric sets

```ts
export const prioritySchema = z.literal(PRIORITIES);
```

`z.enum` rejects numbers. `z.literal` takes the array and gives the same union
back.

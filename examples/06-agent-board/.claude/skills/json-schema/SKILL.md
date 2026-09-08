---
name: json-schema
description: JSON Schema and Zod rules. Use when writing validation schemas, DTO types, or component schemas for a spec.
---

# JSON Schema and Zod

- Declare the value set once in TypeScript, as a `const` object plus a union
  type under the same name. See the `ts-conventions` skill. Everything else
  reads its values.
- Build the Zod schema from the derived values array with
  `z.enum(MESSAGE_KINDS)`. Never retype the strings.
- Zod object schemas for request bodies. Call `.strict()` so an unknown key is
  a `400` and not a silent drop.
- Bound every string. `min(1)` and a sensible `max`.
- Derive the input type with `z.infer`. Do not hand write it twice.
- `required` lists every field that has no default.
- `format` matters: `uuid` for ids, `date-time` for timestamps.
- A response DTO is an `interface`, so an editor shows the fields.

---
name: ts-conventions
description: TypeScript house style for this workspace. The const object plus union enum pattern, named exports, no any, explicit return types on exported functions.
---

# TypeScript conventions

## Enums

Do not use the TypeScript `enum` keyword. A fixed set of named values is a
`const` object plus a union type merged under the same name.

```ts
export const MessageKind = {
  Announcement: 'announcement',
  Question: 'question',
  Complaint: 'complaint',
} as const;

export type MessageKind = (typeof MessageKind)[keyof typeof MessageKind];

export const MESSAGE_KINDS = Object.values(MessageKind);
```

Declaring the const and the type under one name is what allows both
`MessageKind.Announcement` and `let k: MessageKind = 'question'`.

Rules that follow from it:

- The Postgres `CREATE TYPE ... AS ENUM` definition is the source of truth. The
  TypeScript union has to match it, in order.
- Derive the Drizzle `pgEnum` from the same const object. Never write the list
  twice.
- Derive the Zod schema with `z.enum(MESSAGE_KINDS)` from the same const object.
- Naming: singular PascalCase for the type, plural SCREAMING_CASE for the values
  array.
- Never reorder or remove enum members in a migration. Postgres does not allow
  it.

Example 01 teaches this pattern in full and explains why. This workspace uses
the same rules, so a reader who did example 01 sees the same convention twice.

## Everything else

- Export by name. No default exports.
- No `any` in exported signatures. Use `unknown` and narrow it.
- Give every exported function an explicit return type.
- Interfaces for object shapes. Type aliases for unions and for inferred types.
- Relative imports with no file extension.
- Comments say why. The code already says what.

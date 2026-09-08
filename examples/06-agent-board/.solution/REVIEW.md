# Review

## Verdict

The three artifacts agree with each other and with the house conventions.

## Findings

- `src/schema/messages.ts`: `MessageKind` declares `announcement`, `question`,
  `complaint` in that order. `MESSAGE_KINDS` and `messageKindEnum` read the
  same values, so there is one source of truth.
- `openapi/messages.openapi.json`: `components.schemas.MessageKind.enum` holds
  the same three strings in the same order. No drift.
- `openapi/messages.openapi.json`: three operations, `createMessage`,
  `listMessages`, `getMessage`. Every response carries a description.
- `openapi/messages.openapi.json`: every `$ref` points into
  `components.schemas` and every target exists.
- `src/routes/messages.ts`: 201 on create, 400 on a failed parse, 200 on read,
  404 on an unknown or malformed id. That matches what the spec promises.
- `src/routes/messages.ts`: all SQL is parameterised and `limit` is clamped to
  1 through 200, which matches the spec's bounds.

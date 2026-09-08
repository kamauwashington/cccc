---
name: api-design
description: REST shape rules for this workspace. Resource nouns, plural collections, the status codes this project uses, camelCase on the wire.
---

# API design

- One resource per path prefix. Plural noun. `/messages`, never `/message`.
- Three operations here and no more: `POST /messages`, `GET /messages`,
  `GET /messages/{id}`.
- Status codes this project uses:
  - `201` on create, with the created object in the body.
  - `200` on read.
  - `400` when the body fails validation.
  - `404` when the id is unknown or malformed.
- A list response is an object with one array field, so it can grow later.
  `{ "messages": [...] }`, never a bare array.
- camelCase on the wire. snake_case in the database. Map at the edge.
- Timestamps are ISO 8601 strings.
- Errors are `{ "error": "snake_case_code" }`.

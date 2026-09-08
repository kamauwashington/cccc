---
name: oas-3-1
description: OpenAPI 3.1 authoring rules. Use when writing or changing an OAS document.
---

# OpenAPI 3.1

- The top level key is `"openapi": "3.1.0"`. Version 3.1 is JSON Schema 2020-12,
  so `type` may be an array and `examples` is a list.
- Required top level keys: `openapi`, `info` (with `title` and `version`),
  `paths`.
- Every operation gets an `operationId` in camelCase. Code generators use it.
- Every operation gets at least one 2xx response and every response gets a
  `description`. An empty description fails most linters.
- Shared shapes live in `components.schemas` and are referenced with
  `{"$ref": "#/components/schemas/Name"}`. Never inline the same object twice.
- Path parameters are declared with `in: path` and `required: true`.
- Write the document as JSON. This workspace has no YAML parser.

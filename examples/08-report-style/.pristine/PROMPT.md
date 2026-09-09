Build the catalog API in `src/server.ts`. Export `createApp()` and return an
Express app. The data is already in `src/catalog.ts`. Do not change it, do not
add a database, and do not add a dependency.

Routes:

- `GET /health` returns `{ "status": "ok", "service": "catalog" }`.
- `GET /api/categories` returns every category.
- `GET /api/products` returns every product.
- `GET /api/products?category=tools` returns only that category. A category
  nobody stocks returns an empty array.
- `GET /api/products/:id` returns one product, or 404 with
  `{ "error": "not_found" }`.
- Any other path returns 404 with `{ "error": "not_found" }`.

Confirm it compiles with `npm run typecheck`. Do not start a server.

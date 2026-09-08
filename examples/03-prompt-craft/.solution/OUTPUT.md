Goal: paginate GET /orders in src/routes/orders.ts so the page stops timing out.

Constraints:
- Keep the existing response shape. Add a `nextCursor` field and nothing else.
- Default page size is 25, which is what the frontend renders.
- A request with no cursor returns the first page, so current clients keep working.
- Leave the query helpers in that file alone.
- No new dependencies.

Output format: a diff for src/routes/orders.ts plus one new test file.

Success criteria: `npm test` passes, and a request with `?limit=25` returns at
most 25 orders plus a `nextCursor`.

What to avoid:
- Do not add caching. That is a second change and it hides the real fix.
- Do not touch the database schema.
- Do not rename the existing query helpers.

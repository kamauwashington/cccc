---
name: express-conventions
description: Express 5 route handler rules. Use when writing routers, handlers, or middleware in this workspace.
---

# Express 5 conventions

- Export a factory that takes the database and returns a `Router`. Never reach
  for a module level client.
- `async` handlers are fine. Express 5 forwards a rejected promise to the error
  handler on its own.
- Send the response, then `return`. Do not chain `return res.json(...)`.
- Validate the body first. Reply `400` and stop.
- Parameterised SQL only. `$1`, `$2`, never string concatenation.
- Clamp anything a client can grow, such as a `limit` query parameter.
- The router owns no error middleware. `src/app.ts` already has one.

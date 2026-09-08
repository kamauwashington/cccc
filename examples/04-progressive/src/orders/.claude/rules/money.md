---
description: How money is represented in this project
paths: ["src/**/money*.ts", "src/orders/**"]
---

# Money is integer cents

Store and pass every amount as a whole number of cents. Never a float, never a
string, never a decimal library value.

- Use the helpers in `src/orders/money.ts`. They throw `MoneyError` when a
  value is not a safe integer, so a bad amount fails at the boundary.
- Split with `allocate()`. It hands out the remainder one cent at a time so the
  parts add back up to the whole.
- `formatCents()` is for display only. Its result is a string. Feeding that
  string back into arithmetic is the bug this rule exists to prevent.
- Name money fields with a `Cents` suffix (`totalCents`, `amountCents`) so a
  reviewer can see the unit without opening the type.

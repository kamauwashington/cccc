# notifications

Telling the customer what happened. Nothing is actually delivered.

- `types.ts` `Channel`, `NotificationKind`, and the `Notification` shape.
- `templates.ts` a `Record<NotificationKind, Template>`.
- `service.ts` an in memory outbox array.
- `routes.ts` the Express router.

## Rules for this domain

- `TEMPLATES` is exhaustive over `NotificationKind`. Add a kind and `tsc` fails
  until the template exists. That is on purpose.
- An `OrderRefunded` kind and its template already exist and are unused. Send
  that one rather than adding a near duplicate.
- Subjects are short. Bodies are one sentence. A projector has to read them.

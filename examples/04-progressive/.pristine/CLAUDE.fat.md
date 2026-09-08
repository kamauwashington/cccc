# Order processing API

Express 5 service for taking orders, charging for them, shipping them, and
telling the customer about it. This document describes the whole repository so
that you have the full picture before you touch anything.

## Runtime dependencies

| Package | Version | Used by |
| --- | --- | --- |
| `express` | 5.2.x | the app factory and every router |

Express 5 is a major version change from Express 4. Route handlers that return
a promise now forward a rejection to the error handler. The router is created
with `Router()` from the `express` package.

## Development dependencies

| Package | Version | Used by |
| --- | --- | --- |
| `typescript` | 5.9.x | `npm run typecheck` |
| `vitest` | 3.2.x | `npm test` |
| `@types/node` | 22.x | node globals in tests and scripts |
| `@types/express` | 5.x | request and response types |
| `tsx` | 4.x | running the server entry point without a build |
| `zod` | 4.x | available, currently unused |
| `drizzle-orm` | 0.44.x | available, currently unused |
| `@electric-sql/pglite` | 0.3.x | available, currently unused |

All of them are hoisted from the repository root. This workspace declares no
`devDependencies` of its own.

## npm scripts

| Script | Command | What it does |
| --- | --- | --- |
| `test` | `vitest run --reporter=dot` | Runs every test file |
| `typecheck` | `tsc --noEmit` | Type checks the whole workspace |
| `reset` | `node ../../scripts/reset.mjs 04` | Restores the pristine snapshot |
| `fat` | `node swap.mjs fat` | Makes `CLAUDE.fat.md` the root file |
| `lean` | `node swap.mjs lean` | Makes `CLAUDE.lean.md` the root file |
| `context` | `node swap.mjs status` | Prints which root file is active |

## TypeScript configuration

`tsconfig.json` sets these options.

```
target                            ES2022
module                            ESNext
moduleResolution                  bundler
lib                               ES2023
types                             node, vitest/globals
strict                            true
noEmit                            true
skipLibCheck                      true
verbatimModuleSyntax              true
isolatedModules                   true
forceConsistentCasingInFileNames  true
include                           src, tests
```

`verbatimModuleSyntax` means a type only import has to say `import type`. A
plain `import` of a type is a compile error. `isolatedModules` means `const
enum` is not allowed. Plain string enums are allowed and are used throughout.

## The orders domain

Five modules. The money helpers import nothing of their own. The types import
`Cents` from the money helpers. The store imports `Order` from the types. The
service imports from all three. The routes import from the service and the
types.

### The money helpers

```ts
export type Cents = number;
export class MoneyError extends Error {}
export function isCents(value: unknown): value is Cents;
export function cents(value: number): Cents;
export function fromMajorUnits(value: number): Cents;
export function add(a: Cents, b: Cents): Cents;
export function subtract(a: Cents, b: Cents): Cents;
export function multiply(amount: Cents, quantity: number): Cents;
export function sum(values: readonly Cents[]): Cents;
export function allocate(amount: Cents, parts: number): Cents[];
export function formatCents(amount: Cents): string;
```

`cents` throws `MoneyError` when the value is not a safe integer. `allocate`
spreads the remainder one cent at a time so the parts add back up to the whole.
`formatCents` is for display. Its output is a string and must never be fed back
into a calculation.

### The order types

```ts
export enum OrderStatus {
  Pending = 'pending',
  Paid = 'paid',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
}

export enum Currency {
  Usd = 'usd',
  Eur = 'eur',
}

export interface OrderLine {
  sku: string;
  quantity: number;
  unitPrice: Cents;
}

export interface Order {
  id: string;
  customerId: string;
  currency: Currency;
  status: OrderStatus;
  lines: OrderLine[];
  totalCents: Cents;
  createdAt: string;
  updatedAt: string;
}

export interface NewOrderInput {
  customerId: string;
  currency?: Currency;
  lines: OrderLine[];
}
```

### The order store

An in memory `Map<string, Order>` plus a counter. Order ids look like
`ord_0001`. `clear()` empties the map and resets the counter to zero.

```ts
export function nextOrderId(): string;
export function put(order: Order): Order;
export function find(id: string): Order | undefined;
export function list(): Order[];
export function clear(): void;
```

### The order service

```ts
export class OrderError extends Error {}
export function allowedNextStatuses(status: OrderStatus): readonly OrderStatus[];
export function lineTotal(line: OrderLine): Cents;
export function orderTotal(lines: readonly OrderLine[]): Cents;
export function createOrder(input: NewOrderInput): Order;
export function getOrder(id: string): Order;
export function transition(id: string, next: OrderStatus): Order;
export function markPaid(id: string): Order;
export function cancelOrder(id: string): Order;
export function listOrders(): Order[];
export function resetOrders(): void;
```

The transition table is a `Record<OrderStatus, readonly OrderStatus[]>`.

```
pending    -> paid, cancelled
paid       -> shipped, cancelled
shipped    -> delivered
delivered  -> (none)
cancelled  -> (none)
```

### The order routes

Builds `ordersRouter` with `Router()`. Every handler wraps the service call in
a try block and maps `OrderError` to HTTP 400 and anything else to HTTP 500.

## The payments domain

Four modules. The gateway is a deterministic stub, so tests never touch a
network. The service keeps a `Map<string, Payment>` at module level.

### The payment types

```ts
export enum PaymentStatus {
  Authorized = 'authorized',
  Captured = 'captured',
  Voided = 'voided',
  Failed = 'failed',
}

export enum PaymentMethod {
  Card = 'card',
  BankTransfer = 'bank-transfer',
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCents: Cents;
  refundedCents: Cents;
  reference: string;
}
```

### The gateway stub

```ts
export interface GatewayResult {
  ok: boolean;
  reference: string;
}
export function authorize(orderId: string, amount: Cents): GatewayResult;
export function capture(reference: string, amount: Cents): GatewayResult;
export function voidAuthorization(reference: string): GatewayResult;
export function sendBack(reference: string, amount: Cents): GatewayResult;
```

References are prefixed strings. `auth_` becomes `cap_` on capture, `void_` on
a void, and `rfnd_` when money goes back.

### The payment service

```ts
export class PaymentError extends Error {}
export function authorizePayment(orderId: string, amountCents: Cents, method?: PaymentMethod): Payment;
export function capturePayment(id: string): Payment;
export function voidPayment(id: string): Payment;
export function getPayment(id: string): Payment;
export function paymentsForOrder(orderId: string): Payment[];
export function outstanding(payment: Payment): Cents;
export function resetPayments(): void;
```

Payment ids look like `pay_0001`.

## The fulfillment domain

Three files. Shipment ids look like `shp_0001`. Tracking codes are the carrier
name in upper case, a hyphen, then a six digit sequence.

### The shipment types

```ts
export enum ShipmentStatus {
  Queued = 'queued',
  Picked = 'picked',
  Handed = 'handed',
  Delivered = 'delivered',
}

export enum Carrier {
  Ground = 'ground',
  Air = 'air',
  Courier = 'courier',
}

export interface Shipment {
  id: string;
  orderId: string;
  carrier: Carrier;
  status: ShipmentStatus;
  trackingCode: string;
}
```

### The fulfillment service

```ts
export class FulfillmentError extends Error {}
export function createShipment(orderId: string, carrier?: Carrier): Shipment;
export function advance(id: string): Shipment;
export function getShipment(id: string): Shipment;
export function shipmentsForOrder(orderId: string): Shipment[];
export function resetShipments(): void;
```

The shipment chain is linear.

```
queued -> picked -> handed -> delivered -> (none)
```

## The notifications domain

Four modules. The service keeps an array of everything it has sent. Nothing is
delivered anywhere. The outbox is the whole implementation.

### The notification types

```ts
export enum Channel {
  Email = 'email',
  Sms = 'sms',
}

export enum NotificationKind {
  OrderPlaced = 'order-placed',
  OrderPaid = 'order-paid',
  OrderShipped = 'order-shipped',
  OrderDelivered = 'order-delivered',
  OrderCancelled = 'order-cancelled',
  OrderRefunded = 'order-refunded',
}

export interface Notification {
  id: string;
  kind: NotificationKind;
  channel: Channel;
  to: string;
  subject: string;
  body: string;
}
```

### The message templates

`TEMPLATES` is a `Record<NotificationKind, Template>`. Every kind needs an
entry. A missing one is a compile error.

| Kind | Subject |
| --- | --- |
| `order-placed` | We got your order |
| `order-paid` | Payment received |
| `order-shipped` | Your order is on the way |
| `order-delivered` | Delivered |
| `order-cancelled` | Order cancelled |
| `order-refunded` | Refund on the way |

### The notification service

```ts
export class NotificationError extends Error {}
export function notify(kind: NotificationKind, orderId: string, to: string, channel?: Channel): Notification;
export function outbox(): readonly Notification[];
export function resetNotifications(): void;
```

Notification ids look like `ntf_0001`.

## Application wiring

```ts
export function createApp(): Express;
```

`createApp` builds an Express app, adds `express.json()`, then mounts four
routers.

```
/health         inline handler
/orders         ordersRouter
/payments       paymentsRouter
/shipments      fulfillmentRouter
/notifications  notificationsRouter
```

The server entry point calls `createApp().listen(port)`. The port comes from
`process.env.PORT` and falls back to 3000.

## HTTP route table

| Method | Path | Handler |
| --- | --- | --- |
| GET | `/health` | inline |
| GET | `/orders` | `listOrders` |
| POST | `/orders` | `createOrder` |
| GET | `/orders/:id` | `getOrder` |
| POST | `/orders/:id/pay` | `markPaid` |
| POST | `/orders/:id/cancel` | `cancelOrder` |
| GET | `/orders/:id/next-statuses` | `allowedNextStatuses` |
| POST | `/payments` | `authorizePayment` |
| POST | `/payments/:id/capture` | `capturePayment` |
| GET | `/payments/:id` | `getPayment` |
| POST | `/shipments` | `createShipment` |
| POST | `/shipments/:id/advance` | `advance` |
| GET | `/shipments/:id` | `getShipment` |
| GET | `/notifications` | `outbox` |
| POST | `/notifications` | `notify` |

## Conventions

- Every enum has explicit string values. Member names are PascalCase and the
  values are lower case.
- Every module uses `.js` in its relative import paths, since the package is
  ESM and `moduleResolution` is `bundler`.
- Every domain exports a `reset*` function so a test can empty the store.
- Every route handler catches, then maps the domain error class to HTTP 400.
- Money is integer cents everywhere. The money helpers own the arithmetic.
  A float in a money field is a bug, never a rounding choice.
- The order service holds the only status transition table. Routes never
  assign `status` themselves. A new status is one entry in that table plus the
  function that uses it.
- The other three domains are already refund aware and unused. The gateway has
  `sendBack`. Notifications has an `OrderRefunded` kind. Wire, do not rewrite.
- The stores are module level `Map`s. Tests call the `reset*` helpers first.
- Run `npm run typecheck` and `npm test` before you call the work done.

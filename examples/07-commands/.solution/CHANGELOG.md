# Changelog

## 1.4.0 (2026-03-11)

### Added

- **orders**: accept partial refunds on captured orders (`a41c9e2`)
- **orders**: add idempotency keys to the create endpoint (`7d0b5f1`)
- **db**: add a seed command for the local order store (`9a5c261`)
- **api**: expose order totals in the list response (`2d40f95`)

### Fixed

- **orders**: stop double charging when capture is retried (`3e9a114`)
- **pricing**: round tax to the cart currency rather than to USD (`c62d8a7`)
- **db**: reset now clears customers as well as orders (`0f7e3d8`)
- **api**: return 409 instead of 500 on a duplicate order id (`e73a1b6`)
- **orders**: treat a zero amount refund as a no-op (`6ac83b0`)

### Changed

- **orders**: cache the tax table for the life of a request (`b18f430`)
- **orders**: pull refund math into a pure function (`5cb92a0`)
- **db**: index the order store by customer id (`4b0d7a2`)

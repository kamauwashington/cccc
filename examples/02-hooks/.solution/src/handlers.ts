// Two switches. Both end in `assertNever`, so the compiler fails the build the
// moment a new case shows up and nobody handles it.
//
// `assertNever` is defined here, in this file. Every workspace in this course
// keeps its own copy. There is no shared package.

import type { MessageStatus } from './schema';
import type { MessageColumn, MessageRow } from './generated/db-types';

function assertNever(value: never): never {
  throw new Error('unhandled case: ' + JSON.stringify(value));
}

/** Human label for one delivery status. */
export function statusLabel(status: MessageStatus): string {
  switch (status) {
    case 'queued':
      return 'Waiting to send';
    case 'sent':
      return 'Delivered';
    case 'failed':
      return 'Send failed';
    default:
      return assertNever(status);
  }
}

/** One cell of the message table, ready to print. */
export function renderCell(row: MessageRow, column: MessageColumn): string {
  switch (column) {
    case 'id':
      return row.id;
    case 'body':
      return row.body.trim();
    case 'created_at':
      return new Date(row.created_at).toISOString();
    case 'status':
      return statusLabel(row.status);
    default:
      return assertNever(column);
  }
}

/** One line per row, columns joined with a pipe. */
export function renderRow(row: MessageRow, columns: readonly MessageColumn[]): string {
  return columns.map((column) => renderCell(row, column)).join(' | ');
}

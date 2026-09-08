// Behaviour tests for the handlers, plus a type level check that the status
// switch covers the whole union.

import { describe, expect, expectTypeOf, it } from 'vitest';

import { MESSAGE_STATUSES, type MessageStatus } from '../src/schema';
import {
  MESSAGE_COLUMN_SQL,
  type MessageColumn,
  type MessageRow,
} from '../src/generated/db-types';
import { renderCell, renderRow, statusLabel } from '../src/handlers';

// The fixture carries every field the schema has ever had. The assertion keeps
// it valid while the schema grows.
const row = {
  id: 'm-1',
  body: '  hello  ',
  created_at: '2024-03-01T09:30:00.000Z',
  status: 'sent',
} as MessageRow;

const allColumns = Object.keys(MESSAGE_COLUMN_SQL) as MessageColumn[];

describe('statusLabel', () => {
  it('labels each status', () => {
    expect(statusLabel('queued')).toBe('Waiting to send');
    expect(statusLabel('sent')).toBe('Delivered');
    expect(statusLabel('failed')).toBe('Send failed');
  });

  it('covers every status in the union', () => {
    for (const status of MESSAGE_STATUSES) {
      expect(statusLabel(status).length).toBeGreaterThan(0);
    }
  });

  it('takes the whole status union and nothing else', () => {
    expectTypeOf(statusLabel).parameter(0).toEqualTypeOf<MessageStatus>();
    // @ts-expect-error 'archived' is not a MessageStatus, so the switch falls
    // through to assertNever and the compiler rejects the call.
    expect(() => statusLabel('archived')).toThrow(/unhandled case/);
  });
});

describe('renderCell', () => {
  it('renders one cell per column', () => {
    expect(renderCell(row, 'id')).toBe('m-1');
    expect(renderCell(row, 'body')).toBe('hello');
    expect(renderCell(row, 'created_at')).toBe('2024-03-01T09:30:00.000Z');
  });

  it('handles every column the schema declares', () => {
    for (const column of allColumns) {
      expect(() => renderCell(row, column)).not.toThrow();
    }
  });
});

describe('renderRow', () => {
  it('joins the columns it is given', () => {
    expect(renderRow(row, ['id', 'body'])).toBe('m-1 | hello');
  });
});

// Hand written source of truth for the `messages` table.
//
// Everything under src/generated/ is derived from this file by
// `npm run codegen`. Edit this file, then run codegen. Never the other way
// around.

export const MESSAGE_STATUSES = ['queued', 'sent', 'failed'] as const;

export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export interface ColumnSpec {
  /** Column name in Postgres. */
  readonly column: string;
  /** Postgres column type. */
  readonly sql: string;
  /** TypeScript type for the row field. */
  readonly ts: string;
}

export interface TableSchema {
  readonly table: string;
  readonly typeName: string;
  /** Keyed by the camelCase field name used in application code. */
  readonly columns: Readonly<Record<string, ColumnSpec>>;
}

export const messageSchema = {
  table: 'messages',
  typeName: 'Message',
  columns: {
    id: { column: 'id', sql: 'uuid', ts: 'string' },
    body: { column: 'body', sql: 'text', ts: 'string' },
    createdAt: { column: 'created_at', sql: 'timestamptz', ts: 'string' },
    status: { column: 'status', sql: 'text', ts: 'MessageStatus' },
  },
} as const satisfies TableSchema;

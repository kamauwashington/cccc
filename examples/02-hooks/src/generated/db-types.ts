// GENERATED FILE. DO NOT EDIT BY HAND.
//
// Written by `npm run codegen` from src/schema.ts. Anything you type here is
// gone the next time codegen runs. Change src/schema.ts instead.

/** Every column on the `messages` table. */
export type MessageColumn = 'id' | 'body' | 'created_at';

/** One row as it comes back from the database. */
export interface MessageRow {
  id: string;
  body: string;
  created_at: string;
}

export const MESSAGE_TABLE = 'messages';

export const MESSAGE_COLUMN_SQL: Record<MessageColumn, string> = {
  id: 'uuid',
  body: 'text',
  created_at: 'timestamptz',
};

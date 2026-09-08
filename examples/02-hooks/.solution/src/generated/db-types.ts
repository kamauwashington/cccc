// GENERATED FILE. DO NOT EDIT BY HAND.
//
// Written by `npm run codegen` from src/schema.ts. Anything you type here is
// gone the next time codegen runs. Change src/schema.ts instead.

import type { MessageStatus } from '../schema';

/** Every column on the `messages` table. */
export type MessageColumn = 'id' | 'body' | 'created_at' | 'status';

/** One row as it comes back from the database. */
export interface MessageRow {
  id: string;
  body: string;
  created_at: string;
  status: MessageStatus;
}

export const MESSAGE_TABLE = 'messages';

export const MESSAGE_COLUMN_SQL: Record<MessageColumn, string> = {
  id: 'uuid',
  body: 'text',
  created_at: 'timestamptz',
  status: 'text',
};

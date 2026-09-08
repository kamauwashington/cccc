// Copperhead's file. Types, validation, and the enum, in one place.
//
// The enum is declared once as a const object plus a union type under the same
// name, which is the pattern the ts-conventions skill states. Everything else
// reads its values: the Drizzle `pgEnum`, the Zod schema, and the migration.
// When they drift, `tests/schema.test.ts` fails.
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const MessageKind = {
  Announcement: 'announcement',
  Question: 'question',
  Complaint: 'complaint',
} as const;

export type MessageKind = (typeof MessageKind)[keyof typeof MessageKind];

/** Enum values in the order the Postgres type declares them. */
export const MESSAGE_KINDS = [
  MessageKind.Announcement,
  MessageKind.Question,
  MessageKind.Complaint,
] as const;

export const messageKindEnum = pgEnum('message_kind', MESSAGE_KINDS);

export const messagesTable = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: messageKindEnum('kind').notNull(),
  author: text('author').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** What a client is allowed to send to POST /messages. */
export const createMessageSchema = z
  .object({
    kind: z.enum(MESSAGE_KINDS),
    author: z.string().trim().min(1).max(80),
    body: z.string().trim().min(1).max(2000),
  })
  .strict();

export type CreateMessageInput = z.infer<typeof createMessageSchema>;

/** What the API sends back. Snake case in the database, camel case on the wire. */
export interface MessageDto {
  id: string;
  kind: MessageKind;
  author: string;
  body: string;
  createdAt: string;
}

export interface MessageRow {
  id: string;
  kind: string;
  author: string;
  body: string;
  created_at: Date | string;
}

export function toMessageDto(row: MessageRow): MessageDto {
  return {
    id: row.id,
    kind: row.kind as MessageKind,
    author: row.author,
    body: row.body,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

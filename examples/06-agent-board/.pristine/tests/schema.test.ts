// Copperhead's file is checked here. It fails until src/schema/messages.ts
// exports the enum, the Drizzle table, and the Zod schema.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createDb } from '../src/db/client';
import { readEnumLabels, runMigrations } from '../src/db/migrate';
import {
  MESSAGE_KINDS,
  MessageKind,
  createMessageSchema,
  messageKindEnum,
  messagesTable,
  toMessageDto,
} from '../src/schema/messages';

const SPEC = fileURLToPath(new URL('../openapi/messages.openapi.json', import.meta.url));

describe('schema and enum', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createDb();
    await runMigrations(db);
  });

  afterAll(async () => {
    await db.close();
  });

  it('declares three kinds', () => {
    expect(Object.values(MessageKind)).toEqual(['announcement', 'question', 'complaint']);
    expect(MESSAGE_KINDS).toHaveLength(3);
  });

  it('matches the pg_enum catalog exactly, in order', async () => {
    const labels = await readEnumLabels(db);
    expect(labels).toEqual(Object.values(MessageKind));
  });

  it('declares the same values in the drizzle pgEnum', () => {
    expect([...messageKindEnum.enumValues]).toEqual(Object.values(MessageKind));
    expect(messageKindEnum.enumName).toBe('message_kind');
  });

  it('agrees with the OAS document', () => {
    const spec = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
    expect(spec.components?.schemas?.MessageKind?.enum).toEqual(Object.values(MessageKind));
  });

  it('maps the drizzle table onto the real columns', () => {
    const columns = Object.values(messagesTable).map((c: any) => c?.name).filter(Boolean);
    expect(columns).toEqual(
      expect.arrayContaining(['id', 'kind', 'author', 'body', 'created_at'])
    );
  });

  it('accepts a good body', () => {
    const parsed = createMessageSchema.safeParse({
      kind: 'complaint',
      author: 'sidewinder',
      body: 'nobody asked for this board',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a kind outside the enum', () => {
    const parsed = createMessageSchema.safeParse({ kind: 'gossip', author: 'a', body: 'b' });
    expect(parsed.success).toBe(false);
  });

  it('rejects an empty author and an empty body', () => {
    expect(createMessageSchema.safeParse({ kind: 'question', author: '', body: 'b' }).success).toBe(false);
    expect(createMessageSchema.safeParse({ kind: 'question', author: 'a', body: '' }).success).toBe(false);
  });

  it('turns a row into a DTO with camel case and an ISO date', () => {
    const dto = toMessageDto({
      id: '11111111-2222-3333-4444-555555555555',
      kind: 'announcement',
      author: 'bill',
      body: 'the board is open',
      created_at: new Date('2026-01-02T03:04:05.000Z'),
    });
    expect(dto.createdAt).toBe('2026-01-02T03:04:05.000Z');
    expect(dto.kind).toBe(MessageKind.Announcement);
  });
});

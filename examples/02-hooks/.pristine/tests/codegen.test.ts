// The committed generated file has to match what codegen produces from the
// current schema. This is the test that proves a hand edit was wrong.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { renderDbTypes } from '../scripts/codegen.mjs';
import { messageSchema } from '../src/schema';

const WS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED = path.join(WS, 'src', 'generated', 'db-types.ts');

describe('src/generated/db-types.ts', () => {
  it('matches what npm run codegen produces from src/schema.ts', () => {
    const onDisk = fs.readFileSync(GENERATED, 'utf8');
    expect(onDisk).toBe(renderDbTypes(messageSchema));
  });

  it('carries a do not edit banner', () => {
    const onDisk = fs.readFileSync(GENERATED, 'utf8');
    expect(onDisk.startsWith('// GENERATED FILE. DO NOT EDIT BY HAND.')).toBe(true);
  });
});

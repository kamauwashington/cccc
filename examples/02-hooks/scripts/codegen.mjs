#!/usr/bin/env node
// Turns src/schema.ts into src/generated/db-types.ts.
//
//   npm run codegen              write the file
//   npm run codegen -- --stdout  print it instead
//
// Run under tsx so it can import the TypeScript schema directly. The renderer
// is exported so the test suite can compare the committed file against what
// this script would produce right now.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(HERE, '..');
const OUT = path.join(WS, 'src', 'generated', 'db-types.ts');

const PRIMITIVES = new Set(['string', 'number', 'boolean', 'null', 'unknown']);

const BANNER = [
  '// GENERATED FILE. DO NOT EDIT BY HAND.',
  '//',
  '// Written by `npm run codegen` from src/schema.ts. Anything you type here is',
  '// gone the next time codegen runs. Change src/schema.ts instead.',
].join('\n');

/** Render the contents of src/generated/db-types.ts for one table schema. */
export function renderDbTypes(schema) {
  const specs = Object.values(schema.columns);
  const name = schema.typeName;
  const upper = name.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();

  // Any TypeScript type that is not a primitive comes from the hand written
  // schema, so the generated file has to import it back.
  const named = [...new Set(specs.map((s) => s.ts).filter((t) => !PRIMITIVES.has(t)))].sort();
  const importLine = named.length
    ? "import type { " + named.join(', ') + " } from '../schema';\n\n"
    : '';

  const columnUnion = specs.map((s) => "'" + s.column + "'").join(' | ');
  const rowFields = specs.map((s) => '  ' + s.column + ': ' + s.ts + ';').join('\n');
  const sqlEntries = specs.map((s) => '  ' + s.column + ": '" + s.sql + "',").join('\n');

  return (
    BANNER +
    '\n\n' +
    importLine +
    '/** Every column on the `' + schema.table + '` table. */\n' +
    'export type ' + name + 'Column = ' + columnUnion + ';\n\n' +
    '/** One row as it comes back from the database. */\n' +
    'export interface ' + name + 'Row {\n' + rowFields + '\n}\n\n' +
    'export const ' + upper + "_TABLE = '" + schema.table + "';\n\n" +
    'export const ' + upper + '_COLUMN_SQL: Record<' + name + 'Column, string> = {\n' +
    sqlEntries +
    '\n};\n'
  );
}

async function main() {
  const { messageSchema } = await import(pathToFileURL(path.join(WS, 'src', 'schema.ts')).href);
  const text = renderDbTypes(messageSchema);

  if (process.argv.includes('--stdout')) {
    process.stdout.write(text);
    return;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, text, 'utf8');
  process.stdout.write('codegen: wrote src/generated/db-types.ts\n');
}

// Only run when invoked directly. Importing this file must have no side effect.
const invoked = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invoked) await main();
